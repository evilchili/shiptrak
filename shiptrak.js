/*
//	ShipTrak.js v3.1 - Implements the GoogleMaps API
//	Author: Greg Boyington <greg@automagick.us>
*/


// some global variables
//
var points = new Array();
var map;
var plotted=0;
var plotSpeed=250;
var logData = '';
var oldHeader='';
var cancelPlot=0;

var args = parseQueryString();

// set some interface defaults
var isPrint = args['_p'] ? true : false;
var isFullscreen = args['_m'] == 'f' ? true : false;
var isEmbedded	 = args['embedded'] ? true : false;
if ( isPrint ) {
	isFullscreen = false;
	isEmbedded = false;
}
	
// Object constructor for a point on the map.  Encompasses
// the Google Maps' latlng plus log data.
//
function trakPoint( point, com, datestr, pos ) {
	this.latlng 	= point;
	this.comment 	= com;
	this.date 		= datestr;
	this.position	= pos;
	this.marker     = null;
	this.info       = null;
	return this;
}


// Create a marker on the map with a tooltip.
// XXX: consider replacing gxmarker with pdmarker: 
//      http://www.pixeldevelopment.com/pdmarker.asp
//
function createMarker(p, number, icon) {
	var html = "<div class='tooltip'><table border=0>" + 
			 "<tr><td nowrap=1 align=left><b>#" + number + "</b> "+p.date+"</td></tr>" + 
			 "<tr><td nowrap=1 align=left>Position: "+p.position+"</td></tr>" + 
			 "<tr><td align=left>"+p.comment+"</td></tr></table></div>";

	p.marker = new google.maps.Marker({
		"position": p.latlng,
		"map": map,
		"icon": icon,
		"title": "#" + number + ": " + p.date
	});

	p.info = new google.maps.InfoWindow({
		content: html
	});
	google.maps.event.addListener(p.marker, 'click', function() {
		p.info.open(map,p.marker);
	});
}


// Resize the map to a good size relative to the browser window.
//
function resizeMap() {
	var e = getWindowSize();

	var mObj = document.getElementById("map");
	
	var hMargin=10;
	var vMargin=10;
	if ( parseInt( mObj.style.width ) != (e.width-hMargin) ) {
		mObj.style.width  = (e.width-hMargin)+'px';
		mObj.style.height = (e.height-vMargin)+'px';
	}
	// position the map
	mObj.style.bottom= (vMargin /2) +'px';
	mObj.style.left = ( hMargin /2 )+'px';
}

// Initialize the map, and load the data for the callsign specifed on 
// the query string, if any.  This function is called by body.onLoad.
//
function init_shiptrak(callback) {
	// if the user has entered a callsign and chosen a time filter, 
	// update the document title accordingly
	var callsign 	= document.getElementById('callsign');
	var filter 		= document.getElementById('filter');
	if ( callsign ) {
		args['callsign'] = callsign.value;
		args['filter'] = filter.options[filter.options.selectedIndex].value;
		document.title="Position Report For " + args['callsign'];
		if ( args['filter'] != '0' ) document.title += " For Last " + args['filter'] + " Days";
		document.title += "  <  ShipTrak v3.1";
	}
	
	// unless we're showing the print version, set up some initial page styles 
	// and event listeners for the UI.
	if ( ! isPrint ) {
		document.body.style.backgroundColor="black";
		document.body.style.overflow="hidden";
		var mObj = document.getElementById("map");
		mObj.style.position='absolute';
		mObj.style.bottom='0px';
		mObj.style.overflow='hidden';

		if ( document.addEventListener ) {
			window.addEventListener("resize",resizeMap,0);
		} else if ( document.attachEvent ) {
			window.attachEvent("onresize",resizeMap);
		}
		
	}

	// initialize the map elements
	resizeMap();

	// create the google map
	map = new google.maps.Map(document.getElementById("map"), {
		center: new google.maps.LatLng(0,0),
		zoom: 3,
		mapTypeId: google.maps.MapTypeId.MAP,
		mapTypeControl: true,
	    mapTypeControlOptions: {
	        style: google.maps.MapTypeControlStyle.VERTICAL_BAR,
	        position: google.maps.ControlPosition.LEFT_TOP
	    },
		panControl: false,
	    zoomControl: true,
	    zoomControlOptions: {
	        style: google.maps.ZoomControlStyle.MEDIUM,
	        position: google.maps.ControlPosition.LEFT_TOP
	    },
	    scaleControl: true,
	    scaleControlOptions: {
	        position: google.maps.ControlPosition.LEFT_TOP
	    }
    });

	// set up the UI controls to be added to the map
	var uxcontrol = document.createElement("div");
	uxcontrol.id="shiptrakUIContainer";
	uxcontrol.innerHTML = "<div id='leftFloater'>" + 
		"<span id='interface'>" + 
		"Callsign: <input type=text onkeyup='keyup(event)' id='callsign' style='width:75px;' />" + 
	 	"Show: <select id='filter'>" + 
		"<option selected value='0'>All</option>" + 
		"<option value='30'>Last 30 days</option>" + 
		"<option value='60'>Last 60 days</option>" + 
		"<option value='365'>Last 1 year</option>" + 
		"</select>&nbsp;" + 
		"<input type=button onclick='load();' value='View' /></span>" + 
		"<span id='embeddedLabel'></span>" + 
		"&nbsp;<span id='mapTitle'></span></div>"; 

	if ( isEmbedded ) {
		uxcontrol.innerHTML += "<div id='rightFloater'><a href='http://shiptrak.org/?callsign=" + args['callsign']+"' " +
			"title='View Larger' target='_blank' ><img src='fullscreen.png' border='0' /></a></div>";

	} else if ( !isPrint )  {
		uxcontrol.innerHTML += "<div id='rightFloater'>" + 
			"<a href='javascript:printVersion();' title='Print' ><img src='print.png' border='0' /></a>" + 
			"<a href='faqv3.html' title='Frequently Asked Questions'><img src='faq.png' border='0' /></a>" + 
			//"<a href='http://htmlgear.tripod.com/guest/control.guest?u=mmsn&i=1&a=view' target='_blank' title='Sign Our Guestbook'><img src='guestbook.png' border='0' /></a>" + 
			"<a href='mailto:ShipTrak%20Admin%20%3Cve3ii@mmsn.org%3E?subject=Question About ShipTrak v3.1' title='Contact ShipTrak'><img src='contact.png' border='0' /></a>" + 
			"<a href='javascript:showShare();' title='Share This Map'><img src='link.png' border='0' /></a>" + 
			"<a href='javascript:showAbout();' title='Credits'><img src='about.png' border='0' /></a>" + 
			( isFullscreen==true ? 	
				"<a href='javascript:window.close();' title='Close Fullscreen'><img src='close.png' border='0' /></a>" : 
				"<a href='javascript:openFull();' title='Open Fullscreen'><img src='fullscreen.png' border='0' /></a>" );
	}
	map.controls[google.maps.ControlPosition.TOP_LEFT].push(uxcontrol);
	
	// if we're not showing the print version, add the log control
	if ( ! isPrint ) {
		var logcontrol = document.createElement("div");
		logcontrol.id="shiptrakLogContainer";
		logcontrol.innerHTML = '<div id="log"></div>';
		map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(logcontrol);
		
	} else {
		document.getElementById('logToggler').style.display='none';
	}
	
	var isReady = window.setInterval(function() {
		if ( ! document.getElementById('shiptrakUIContainer')  )
			return;

		clearInterval(isReady);

		if ( ! isPrint ) document.getElementById('callsign').focus();

		if ( isEmbedded || isPrint ) {
			if ( ! isPrint ) {
				document.getElementById('shiptrakLogContainer').style.display='none';
				document.getElementById('embeddedLabel').innerHTML="ShipTrak Report: "+args['callsign'];
			}
			document.getElementById('interface').style.display='none';
			document.getElementById('embeddedLabel').style.display='inline';
		}
	
		if ( args['filter'] ) {
			var f = document.getElementById('filter');
			if ( f ) {
				for ( var i=0; i<f.options.length; i++ ) {
					if ( parseInt(f.options[i].value) == parseInt(args['filter']) ) {
						f.options[i].selected=1;
					}
				}
			}
		}

		document.getElementById('interface').style.display = 'inline';
		document.getElementById('logToggler').style.display='block';

		// The interface is all set, so now go get some data
		if ( args['callsign'] ) {
			document.getElementById('callsign').value=args['callsign'];
			if ( callback ) {
				callback();
			}
		}
	}, 250);
}


// Use AJAX to retrieve position reports for a given callsign.
//
function load() {

	cancelPlot=1;

	// no callsign?  no data!
	var callsign = document.getElementById('callsign') ? 
		document.getElementById('callsign').value : args['callsign'];
	if ( ! callsign ) {
		alert("Please enter a callsign.");
		return;
	}

	var f = document.getElementById('filter');
	var filter = f.options[f.options.selectedIndex].value;

	// Change the map header to read 'Loading...'
	if ( isEmbedded ) {
		var mapTitle = document.getElementById('embeddedLabel');
	} else {
		var mapTitle = document.getElementById('mapTitle');
	}
	oldHeader = mapTitle.innerHTML;
	mapTitle.innerHTML='<blink>Loading...</blink>';

	// set up the ajax event handler
	var req = new XMLHttpRequest;
	req.onreadystatechange = function() {
		if ( this.readyState == XMLHttpRequest.DONE ) {
		    var xmlDoc = req.responseXML;

			if ( isEmbedded ) {
				var mapTitle = document.getElementById('embeddedLabel');
			} else {
				var mapTitle = document.getElementById('mapTitle');
			}

			// parse out errors returned by the CGI
			var xmlErr = xmlDoc.documentElement.getElementsByTagName("error");
			if ( xmlErr.item(0) ) {
				var msg = xmlErr.item(0).getAttribute('message');
				mapTitle.innerHTML = "Error: "+msg;
				return;
			}

			// Make sure we have some data.  	
		    var markers = xmlDoc.documentElement.getElementsByTagName("marker");
			if ( markers.length == 0 ) {
				var str = "No positions found for "+callsign + ( filter>0 ? " in the last "+filter+" days." : '.' );
				mapTitle.innerHTML=str;
				return;
			}
	
			points = new Array();
			plotted=0;
			cancelPlot=0;
	
			// Step through the markers returned by the CGI, create trackPoints 
			// and log entry HTML.
			logData='';
		    for (var i = 0; i < markers.length; i++) {
				var tPoint = new trakPoint (
								new google.maps.LatLng(
									parseFloat(markers[i].getAttribute("lat")),
									parseFloat(markers[i].getAttribute("lng"))
								),
								markers[i].getAttribute("comment"),
								markers[i].getAttribute("date"),
								markers[i].getAttribute("coords") ) 
		       	points.push( tPoint );
  				logData += "<tr onmouseover='this.className=\"logHilight\";' onmouseout='this.className=\"\";'>";
				logData += "<td align='right' nowrap='1' >"+(i+1)+"</td><td nowrap='1'>"+tPoint.date+"</td><td nowrap='1'>"+tPoint.position+"</td><td width=100% >"+tPoint.comment+"</td></tr>";
			}

			// Reset the map to default zoom and type, removing any existing markers.
			init_shiptrak(function() {
	
				if ( isEmbedded ) {
					var mapTitle = document.getElementById('embeddedLabel');
				} else {
					var mapTitle = document.getElementById('mapTitle');
				}
	
				// add the log data to the page
	  			document.getElementById('log').innerHTML = ( ! isEmbedded && ! isPrint ? 
					"<div id='logCloser' align='center'><table border='0'><tr><td>" + 
					"<a href='javascript:toggleLog();'><img src='log.png' border='0' /></a>" + 
					"</td><td><a href='javascript:toggleLog();'>&nbsp;Hide Log Entries</a></td>" + 
					"</tr></table></div>" : "" ) + 
					"<table border='0' cellspacing='0' cellpadding='5' width='100%' >" + 
					"<tr><th align='right'>Entry</th><th align='left'>Date</th><th align='left'>Position</th><th width='*' align='left'>Comment</th></tr>" + 
					logData+"</table>";
		
				// start the animation at the first point
				mapTitle.innerHTML = ( isEmbedded || isPrint ) ? ( 'Shiptrak Report: ' + callsign ) :  'Displaying ' + points.length + ' Positions:';
				map.panTo(points[0].latlng);
				if ( isPrint ) {
					plot();
				} else {
					window.setTimeout("plot()",plotSpeed);
				}
			});
		}
	};

	// get the data
	req.open("GET", "/xmlreq.cgi?callsign="+callsign+"&filter="+filter, true);
	req.send(null);
}


// Step through the points() array, creating overlays on the map, 
// with a recursive call via setTimeout() to 'animate' the points.
function plot() {

	// If we've plotted all the points, or if a new callsign has 
	// been loaded before our animation is done, stop plotting.
	//
	if ( plotted == points.length || cancelPlot ) {
		//map.setMapType(oldMapType);
		cancelPlot=0;
		plotted=0;
		if ( isPrint ) setTimeout( "window.print()",1000 );
		return;
	}

	if ( plotted > 0 ) {
		map.panTo(points[plotted - 1].latlng);
	}

	// create the marker
	var p = points[plotted];
	var m;
	if ( plotted == points.length - 1 ) {
		createMarker(p,plotted+1);
	} else {
		createMarker(p,plotted+1,"point_red.png");
	}

	// set the timeout to do the next point
	plotted++;
	if ( isPrint ) {
		plot();
	} else {
		window.setTimeout("plot()",plotSpeed);
	}
}


// parse the query string into an associative array.
function parseQueryString() {
	var queryPos = window.location.href.indexOf('?'); //.substring(1);
	if ( queryPos == -1 ) return [];
	var query = window.location.href.substr(queryPos+1);
	var vars = query.split("&");
	var a=[];
	for (var i=0;i<vars.length;i++) {
		var pair = vars[i].split("=");
		if ( pair[0] ) a[ pair[0] ] = pair[1];
  	} 
	return a;
}

// figure out how big the current browser window is.
function getWindowSize(){
	var e = new Object();
	if(window.self && self.innerWidth){
		e.width = self.innerWidth;
		e.height = self.innerHeight;
	}else if(document.documentElement && document.documentElement.clientHeight){
		e.width = document.documentElement.clientWidth;
		e.height = document.documentElement.clientHeight;
	}else{
		e.width = document.body.clientWidth;
		e.height = document.body.clientHeight;
	}
	return e;
}

// capture the return key in the callsign box
function keyup(e) {
	var val = typeof(e.which) != 'undefined' ?  e.which : e.keyCode;
	if ( val == 13 ) {
		load();
	}	
}

// open a near-fullscreen browser window
function openFull() {
	var url = getMapURL();
	url += ( url.indexOf('?') > -1 ? '&' : '?' ) + '_m=f';
	if (navigator.appName == "Microsoft Internet Explorer") { 
		window.open(url, '', 'fullscreen=yes, scrollbars=no, resizable=yes').focus();
	} else { 
		window.open(url, '', 'width='+(screen.width-5)+',height='+(screen.height-30)+',scrollbars=auto').focus();
	}
}

// animation routines for sliding the log up and down
var logIsMoving=false;
function toggleLog() {
	if ( logIsMoving ) return;

	var obj = document.getElementById('shiptrakLogContainer');
	logIsMoving=true;

	if ( obj.style.display == 'block' ) {
		obj.style.overflow='hidden';
		setTimeout( "moveLog(-1)", 10 );
	} else {
		document.getElementById('logToggler').style.display='none';
		obj.style.overflow='hidden';
		obj.style.height=0;
		obj.style.display='block';
		setTimeout( "moveLog(1)", 10 );
	}
}
function moveLog(step) {
	var obj = document.getElementById('shiptrakLogContainer');
	obj.style.height = ( parseInt(obj.style.height) + step ) + "%";
	var h = parseInt(obj.style.height);
	if ( h==35 ) {
		obj.style.overflow='auto';
		logIsMoving=false;
	} else if ( h == 0 ) {
		obj.style.display='none';
		logIsMoving=false;
		document.getElementById('logToggler').style.display='block';
	} else {
		setTimeout( "moveLog("+step+")", 10 );
	}
}


// return the url for the current map
function getMapURL() {
	var callsign 	= document.getElementById('callsign').value;
	var filter 		= document.getElementById('filter').options[document.getElementById('filter').options.selectedIndex].value;
	return url = 'http://shiptrak.org/?callsign=' + callsign+"&filter="+filter;
	//return url = 'http://shiptrak.automagick.us/?callsign=' + callsign+"&filter="+filter;
}

// open a browser window with a printable version of the map
function printVersion() {
	var url = getMapURL();
	url += ( url.indexOf('?') > -1 ? '&' : '?' ) + '_p=1';
	window.open(url,"","width=600,height=400");	
}


// display the sharing options in an overlay dialog
function showShare() {
	var callsign 	= document.getElementById('callsign').value;
	var url = getMapURL();
	var embed = "&lt;iframe id=&apos;shiptrakIframe&apos; style=&apos;width:300px;height:300px;border:1px solid #000;&apos; "+ 
				"src=&apos;"+url+"&embedded=1&apos; frameborder=&apos;0&apos; framespacing=&apos;0&apos; /&gt;";

	var html = "<font size='+1'><b>Share This Map:</b></font><br />" + 
		   "<p>Copy and paste this link into an email or instant message:<br />" + 
		   "<input type='text' style='width:350px;' value='"+url+"' /></p>" + 
			"<p>Copy and paste this code into your webpage to embed this map:<br />" + 
			"<input type='text' style='width:350px;' value='"+embed+"' /></p>" + 
			"<p>Click this link to send this page via email:<br />" + 
			"<a href='mailto:?subject=ShipTrak%20Report%20For%20"+callsign+"&body="+url+"'>Email This Map</a></p>";
				
	popup(html, 400,200 );
}

// display the about overlay dialog
function showAbout() {
	var html = "<center><a href='http://mmsn.org' target='_blank'><img src='/mmsn-logo1a.gif' border='0' /></a>" + 
		"<p><b>ShipTrak v3.0</b><br />" + 
		"by <a href='http://automagick.us' target='_blank'>Automagickus</a></p></center>" + 
		"<p>ShipTrak is a free service of the <a href='http://mmsn.org' target='_blank'>Maritime Mobile Service Network</a>.  " + 
		"We gratefully acknowledge the participation of <a href='http://winlink.org' target='_blank'>Winlink 2000</a> " + 
		"and <a href='http://pangolin.co.nz/' target='_blank'>Yotreps</a>.  " + 
		"Website icons courtesy <a href='http://www.pinvoke.com/' target='_blank'>Yusuke Kamiyamane</a>.  " + 
		"Powered by <a href='http://google.com' target='_blank'>Google</a>.</p>" + 
		"<p>Your administrator is <a href='mailto:ve3ii@mmsn.org?subject=shiptrak%202%20question'>Tom VE3II</a>.</p>" + 
		"<p><a rel='license' href='http://creativecommons.org/licenses/by-sa/3.0/us/'><img alt='Creative Commons License' style='border-width:0;margin:2px;float:left;' src='http://i.creativecommons.org/l/by-sa/3.0/us/88x31.png'/></a><span xmlns:dc='http://purl.org/dc/elements/1.1/' href='http://purl.org/dc/dcmitype/InteractiveResource' property='dc:title' rel='dc:type'>ShipTrak</span> is licensed under a <a rel='license' href='http://creativecommons.org/licenses/by-sa/3.0/us/'>Creative Commons Attribution-Share Alike 3.0 United States License</a>.</p>";
		
	popup( html, 350, 350 );
}

// display an overlay dialog -- used by showAbout() and showShare()
function popup(html,x,y) {
    var wPos = getFrameCenter(top);
    var posX = x ? Math.round( wPos[0] - ( x / 2 ) ) : wPos[0];
    var posY = y ? Math.round( wPos[1] - ( y / 2 ) ) : wPos[1];

    var popup = document.getElementById('OverlayPopup');
    var newPopup = false;
    if ( ! popup ) {
        newPopup = true;
        popup = document.createElement('div');
        popup.id='OverlayPopup';
        popup.className='OverlayPopup';
        if ( posX || posY ) {
            document.body.appendChild(popup);
        } else {
            document.body.appendChild(popup);
        }
    }
    if ( ! popup ) { return; }

	popup.style.margin = '0';	
    popup.style.top  = posY ? posY+'px' : '0px';
    popup.style.left = posX ? posX+'px' : '0px';

    if ( x ) popup.style.width=x+'px';
    if ( y ) popup.style.height=y+'px';

    popup.innerHTML = html + "<div id='popupOkayButton'><input type='button' value='Okay' onclick='closePopup();' /></center>";
	popup.style.display='block';

}

// hide the overlay dialog
function closePopup() {
    var popup = top.document.getElementById('OverlayPopup');
    popup.parentNode.removeChild(popup);
}

// figure out the center coordinates of the browser window
function getFrameCenter(frame) {
    if ( !frame ) frame = self;
    var x,y,ox,oy;
    if (frame.innerHeight) // all except Explorer
    {   
        x = frame.innerWidth;
        y = frame.innerHeight;
        ox = frame.pageXOffset;
        oy = frame.pageYOffset;
    }   
    else if (frame.document.documentElement && frame.document.documentElement.clientHeight)
        // Explorer 6 Strict Mode
    {   
        x = frame.document.documentElement.clientWidth;
        y = frame.document.documentElement.clientHeight;
        ox = frame.document.documentElement.scrollLeft;
        oy = frame.document.documentElement.scrollTop;
    }   
    else if (frame.document.body) // other Explorers
    {   
        x = frame.document.body.clientWidth;
        y = frame.document.body.clientHeight;
        ox = document.body.scrollLeft;
        oy = document.body.scrollTop;
    }   

    return [ ox + Math.round( x / 2 + .5 ), oy + Math.round( y / 2 + .5 ) ];
}

google.maps.event.addDomListener(window, 'load', function() {
	init_shiptrak(load);
});
