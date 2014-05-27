#!/usr/bin/perl

use strict;
use CGI qw/standard/;
use CGI::Carp qw/fatalsToBrowser/;

my $dir = '/var/www/html/data';

opendir(D, $dir)
	or die "Couldn't open data dir: $!";

print "Content-Type:  text/html\n\n";
print <<EOF;
<html>
<head>
</head>
<body>
EOF
foreach ( sort grep { /\.xml/ } readdir(D) ) {
	s/\.xml$//;
	print qq(<a target=mapFrame href="/index.html?callsign=$_">$_</a><br>);
}
print "</body></html>";
closedir(D);
exit;
