#!/usr/bin/perl  -I/var/www/site_perl
#
# dumpcache.cgi - clean out cache directory

use strict;
use Common;
use CGI::Carp qw/fatalsToBrowser/;

print <<EOF;
Content-Type:  text/html\015\012\015\012
EOF

if ($FORM->{callsign}) {
	my %entries;
	my $datacache = lc $datadir.$ps.$FORM->{callsign}.'.cache';
print "Opening $datacache\n";
	if (-f $datacache) {
		eval {
			open (IN, $datacache) or die "Couldn't open $datacache: $!";
			local $/=undef;
			my $VAR1;
			eval('$VAR1 = '.<IN>);
			%entries = %$VAR1;
			close(IN);
		};
		$@ and die "Couldn't load data from cache: $@";

		if ($FORM->{action} eq 'Clear Selected Positions') {
			delete $entries{$_} foreach (split /,/, $FORM->{selected});
			use Data::Dumper;
			open OUT, ">".$datacache or die "Couldn't open $datacache: $!";
			my $d = Data::Dumper->new([\%entries]);
			$d->Indent(0);
			$d->Terse(1);
			print OUT $d->Dump();
			close OUT;
		}

		print <<EOF;
<h2>Data For $FORM->{callsign}</h2>
<form name=f method=post>
<input type=hidden name=callsign value="$FORM->{callsign}">
<table border=0>
EOF
		foreach (sort keys %entries) {
			my $line = join " ", @{$entries{$_}};
			print <<EOF;
<tr>
	<td>
		<input type=checkbox name='selected' value='$_'>
	</td>
	<td>
		$line
	</td>
</tr>
EOF
		}
		print <<EOF;
</table>
<br>
<input type=submit name=action value='Clear Selected Positions'>
</form>
[ <a href="/?callsign=$FORM->{callsign}">View Position</a> ]
EOF
	} else {
		print "No cached data for $FORM->{callsign}.";
	}
	exit;
}

if ($FORM->{action} ne "Empty Cache Now") {
	print "<pre>";
	print `ls -la /var/www/html/cache/*`;
	print <<EOF;
</pre>
<form>
<input type=submit name="action" value="Empty Cache Now">
</form>
EOF
	exit;

} else {
	
	system "rm -f /var/www/html/cache/*";
	confess $@ if $@;
	print "Done.";
}

exit;

