#!/usr/bin/perl  -I /var/www/site_perl
#
# returns XML formatted data for a ship's position.

use strict;
use CGI qw/:standard/;
use Fcntl ':flock';
use Date::Manip;
use IO::Socket;
use Data::Dumper;
use HTTP::Request::Common qw/POST/;
use LWP::UserAgent;

my $ps       = "/";

my $WINLINK_API_URL = "http://server.winlink.org:8085/";

my $UA = LWP::UserAgent->new();

# shiptrak.org
my $datadir  = $ps . join $ps, qw/var www ship_data/;

# shiptrak.automagick.us
#my $datadir  = $ps . join $ps, qw/usr local vhosts automagic.us ship_data/;

my $winlink_connected=0;
my $yotreps_connected=0;

print "Content-Type: text/xml\n\n";
print qq(<?xml version="1.0" encoding="ISO-8859-1" ?>\n);
&printError('Please specify a callsign.')  unless param();
my $callsign = lc param('callsign');
$callsign =~ s/\W//g;
&printError('Callsigns may only contain letters and numbers.')  unless $callsign;

eval {	print &xmlData(&qthdata($callsign,param('filter'))) };
warn $@."\n", &printError('An error occured; please try again.') if ($@);
exit;

sub printError() {
	my $msg = shift;
	print qq(<errors><error message="$msg"/></errors>);
	warn "Error: $msg\n";
	exit;
}

# <markers>
#   <marker lat="37.441" lng="-122.141"/>
#   <marker lat="37.322" lng="-121.213"/>
# </markers>

sub xmlData {
	my $ref = shift;
	my $xml = "<markers>\n";
	if ( ref($ref) eq 'ARRAY' ) {
		foreach my $e ( @$ref ) {
			my ( $latdeg,$latmin,$latsec,$latdir,$londeg,$lonmin,$lonsec,$londir,$date,$comment ) = @$e;
			my $lat = &latlong2dec( $latdeg,$latmin,$latsec,$latdir );
			my $lng = &latlong2dec( $londeg,$lonmin,$lonsec,$londir );
			#warn "Adding $lat/$lng/$date\n";
			$comment =~ s/\&/and/g;
			$comment =~ s/\"/''/g;
			my ($src) = ( $comment =~ /(\w+)\:/ );
			my $coords = sprintf qq(%03dd %02d.%02d %1s / %03dd %02d.%02d %1s), 
					( $latdeg,$latmin,$latsec,$latdir,$londeg,$lonmin,$lonsec,$londir );
	
			$xml .= qq(<marker lat="$lat" lng="$lng" src="$src" date="$date" coords="$coords" comment="$comment"/>\n);
	
		}
	}
	$xml .= "</markers>";
	return $xml;
}

# convert coordinates to decimal degrees
#
sub latlong2dec {
	return  ( $_[0] + ($_[1] /60) + ($_[2]/60) /60 ) * ( $_[3] eq "S" || $_[3] eq "W" ? -1 : 1 );
}


sub lock {
	my $handle = shift;
	flock $handle, LOCK_EX;
	seek $handle, 0, 2;
}
sub unlock {
	my $handle = shift;
	flock $handle, LOCK_UN;
}

sub readCache {
	my $callsign = shift;

	# check for cached data
	my $datacache = lc $datadir.$ps.$callsign.'.cache';
	my %cached;
	if (-e $datacache) {
		eval {
			open (IN, $datacache) or die "Couldn't open $datacache: $!";
			my $VAR1;
			my $str = join('',<IN>);
			close(IN);	
			if ( $str ) {
				eval( '$VAR1 = '.$str );
				%cached = %$VAR1;
			}
		};
		$@ and warn "Couldn't load data from cache: $@";
	}
	return \%cached;
}
sub writeCache {
	my $callsign = shift;
	my $cached   = shift;
	my $entries  = shift;

	# Add any new records to the existing cache
	$entries->{ $_ } = $cached->{ $_ } foreach keys %$cached;

	# cache the data, if there is any
	eval {
		my $datacache = lc $datadir.$ps.$callsign.'.cache';
		use Data::Dumper;
		open OUT, ">".$datacache or die "Couldn't open $datacache: $!";
		my $d = Data::Dumper->new([$entries]);
		$d->Indent(0);
		$d->Terse(1);
		print OUT $d->Dump();
		close OUT;
	};
	$@ and warn "Error saving cache: $@\n";

}

sub qthdata {

	my ($callsign) = shift;
	my ($filter)   = shift;

	my %entries;
	my @return = ();

	my ($y,$m,$d) = (localtime(time))[5,4,3];
	my $err;
	my @fdates = ( DateCalc( 'today', "$filter days ago", \$err ) =~ /(\d\d\d\d)(\d\d)(\d\d)/ );
	my $cutoff = $filter > 0 ? sprintf('%04d-%02d-%02d 00:00', @fdates) : '0000-00-00 00:00:00';

	# check for cached data
	my $cached = &readCache( $callsign );

	# only display the records the user has asked for.
	foreach ( sort keys %$cached ) {
		if ( $_ gt $cutoff ) {
			$entries{$_} = $cached->{$_};
		}
	}
	
	# winlink's fancy new API only lets us get *all* reports.
	# Timestamp,Callsign,ReportedBy,Latitude,Longitude,Heading,Speed,Comment,Marine,Yotreps,Aprs
	# 0001-01-01,String,String,0,0,String,String,String,False,False,False
	my $req = POST($WINLINK_API_URL . '/positionReports/get.csv', [ 'callsign' => $callsign ]);
	my @lines = split /\n/, $UA->request($req)->as_string();
	shift @lines;
	foreach (@lines ) {
		my ($date, $call, $reporter, $lat, $lon, $heading, $speed, $comment, $marine, $yotreps, $aprs) = split /,/;

		my ($latdeg, $latmin) = split /\./, $lat;
		my ($londeg, $lonmin) = split /\./, $lon;

		next unless $lat && $lon;

		$date =~ s/\//-/g;
		my @entry = ($latdeg,$latmin,0,$latdir,$londeg,$lonmin,0,$londir,$date, $_->{Comment} );
		$entries{ $date } = \@entry;
	}

	#warn "$callsign: currently have " . scalar(keys %entries) . " entries.";

	# if we're still here, winlink has no data, so try YOTREPs.
	#
	#http://www.pangolin.co.nz/yotreps/v.php?sl=wh6cvf&fm=01011970&to=08112003&au=999999999
	
	eval ("use LWP::Simple qw(!head)");
	$@ and die "Couldn't load LWP::Simple: $@";

	# format the from date for the yotreps call
	my $fmdate = $filter > 0 ? sprintf('%02d%02d%04d', $fdates[2],$fdates[1],$fdates[0]) : '01011970';

	# http://www.pangolin.co.nz/xtras/yotreps/v.php
	my $url = sprintf('http://www.pangolin.co.nz/xtras/yotreps/v.php?sl=%s&fm=%s&to=%02d%02d%04d&au=999999999',$callsign,$fmdate,$d,++$m,$y+1900);

	#warn "Getting $url\n";
	my $response = get($url);
	if (!$response) {
		$yotreps_connected=0;
	} else {
		$yotreps_connected=1;

		#die "Received from YOTREPS:\n$response";
		$response =~ s/.*\$\$//;
		# KB6OYO   08/04/2003 04:3015 55 N 114 35 W2554.2WNW14 NW 1.20  1014  0     
		while ($response =~ /$callsign\s+(.{16})(.{16})/gci) {
			my ($date,$position) = ($1,$2);
			my ($d,$m,$y,$t) = ($date =~ m[(\d\d)/(\d\d)/(\d\d\d\d)\s+(.*)]);
			$date = "$y-$m-$d $t:00";
			my ($latdeg,$latmin,$latdir,$londeg,$lonmin,$londir) =
				($position =~ /(\d+)\s*(\d+)\s*(\w)\s*(\d+)\s*(\d+)\s*(\w)/);
			#my @entry = ($latdeg,$latmin,0,$latdir,$londeg,$lonmin,0,$londir,$date,'YOTREPS');
			my @entry = ($latdeg,$latmin,0,$latdir,$londeg,$lonmin,0,$londir,$date);
			$entries{$date} ||= \@entry;
		}

	}

	&writeCache( $callsign, \%entries, $cached );

	push @return, $entries{$_} foreach sort keys %entries;

	return @return ? \@return : undef;

}

1;
