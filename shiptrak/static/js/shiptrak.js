/*
//	ShipTrak.js v4.0 - Implements the GoogleMaps API
//	Author: Greg Boyington <greg@automagick.us>
*/

var ShipTrak = {};

// hide the overlay dialog
function closePopup(e) {
    $('#OverlayPopup').hide();
    return false;
}
function toggle_log(e) {
    e.preventDefault(); 
    var log = $("#log");
    if (log.is(':visible')) {
        $("#log").hide('fast');
    } else if (ShipTrak.points.length) {
        $("#log").show('fast');
    }
    return false;
}


$("document").ready(function() {

    "use strict";

	// Object constructor for a point on the map.  Encompasses
	// the Google Maps' latlng plus log data.
	//
    var trakPoint = function( point, com, datestr, pos ) {
		this.latlng 	= point;
		this.comment 	= com;
		this.date 		= datestr;
		this.position	= pos;
		this.marker     = null;
		this.info       = null;
		return this;
	};

    ShipTrak.init = function() {

    	ShipTrak.VERSION = 4.0;
    	
    	ShipTrak.points = new Array();
    	ShipTrak.map = null;
    	ShipTrak.plotted=0;
    	ShipTrak.plotSpeed=250;
    	ShipTrak.logData = '';
    	ShipTrak.oldHeader='';
    	ShipTrak.cancelPlot=0;
    	ShipTrak.args = {};
        ShipTrak.isReady = false;

        ShipTrak.callsign = $("#id_callsign");
        ShipTrak.filter = $("#id_filter");
        ShipTrak.parseQueryString();
        ShipTrak.makeMap();

    	// set some interface defaults
    	ShipTrak.isPrint = ShipTrak.args['_p'] ? true : false;
    	ShipTrak.isFullscreen = ShipTrak.args['_m'] == 'f' ? true : false;
    	ShipTrak.isEmbedded	 = ShipTrak.args['embedded'] ? true : false;
    	if ( ShipTrak.isPrint ) {
    		ShipTrak.isFullscreen = false;
    		ShipTrak.isEmbedded = false;
    	}

        if ( ShipTrak.args['callsign']) {
            ShipTrak.args['callsign'] = $.trim(ShipTrak.args['callsign']);
            ShipTrak.callsign.val(ShipTrak.args['callsign']);
        }
        if ( ShipTrak.args['filter']) {
            ShipTrak.filter.val(ShipTrak.args['filter']);
        }

        ShipTrak.reset(ShipTrak.load);
    };

    ShipTrak.makeMap = function() {
        ShipTrak.isReady = false;

		// create the google map
		ShipTrak.map = new google.maps.Map(document.getElementById("map"), {
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

        google.maps.event.addListenerOnce(ShipTrak.map, 'idle', function(){
            ShipTrak.isReady = true;
        });
    };

		
	// Convert lat and lon from decimal degrees to degrees, minutes and seconds.
	//
	ShipTrak.dd2dms = function(num, isLat) {
	
	    var dir = isLat ? 'N' : 'E';
	    if (num < 0) {
	        dir = isLat ? 'S' : 'W';
	        num = -1 * num;
	    }
	
	    // degrees = degrees
	    var degrees = parseInt(num);
	
	    // * 60 = mins
	    var remainder  = (num % 1) * 60;
	    var minutes = parseInt(remainder);
	
	    // * 60 again = secs
	    var seconds = Math.round((remainder % 1) * 60);
	
	    return degrees + "° " + minutes + "' " +  seconds + '" ' + dir;
	}
	
	// Create a marker on the map with a tooltip.
	// XXX: consider replacing gxmarker with pdmarker: 
	//      http://www.pixeldevelopment.com/pdmarker.asp
	//
	ShipTrak.createMarker = function(p, number, icon) {
		var html = "<div class='tooltip'><table border=0>" + 
				 "<tr><td nowrap=1 align=left><b>#" + number + "</b> "+p.date+"</td></tr>" + 
				 "<tr><td nowrap=1 align=left>Position: "+p.position+"</td></tr>" + 
				 "<tr><td align=left>"+p.comment+"</td></tr></table></div>";
	
		p.marker = new google.maps.Marker({
			"position": p.latlng,
			"map": ShipTrak.map,
			"icon": icon,
			"title": "#" + number + ": " + p.date
		});
	
		p.info = new google.maps.InfoWindow({
			content: html
		});
		google.maps.event.addListener(p.marker, 'click', function() {
			p.info.open(ShipTrak.map,p.marker);
		});
	}
	
    ShipTrak.showError = function(msg) {
        popup("Please try again.", msg, 320);
    }
	
	// Resize the map to a good size relative to the browser window.
	//
	ShipTrak.resizeMap = function() {
		var mObj = $("#map");

		if (ShipTrak.isPrint) {
			mObj.css({'width': '100%', 'height': '500px'});
			return;
		}

		var e = getWindowSize();
		var hMargin=10;
		var vMargin=60;
		if ( mObj.width() != (e.width-hMargin) ) {
			mObj.width(e.width-hMargin)+'px';
			mObj.height(e.height-vMargin)+'px';
		}

		// position the map
		mObj.css({bottom: (vMargin /2) +'px', left: ( hMargin /2 )+'px' });
	}
	
	// Initialize the map, and load the data for the callsign specifed on 
	// the query string, if any.  This function is called by body.onLoad.
	//
	ShipTrak.reset = function(callback) {

		// if the user has entered a callsign and chosen a time filter, 
		// update the document title accordingly
		if ( ShipTrak.callsign ) {
			ShipTrak.args['callsign'] = ShipTrak.callsign.val();
			ShipTrak.args['filter'] = ShipTrak.filter.val();
            var title = "Position Report For " + ShipTrak.args['callsign'];
			if ( ShipTrak.args['filter'] != '0' ) title += " For Last " + ShipTrak.args['filter'] + " Days";
			title += "  <  ShipTrak v" + ShipTrak.VERSION;
            document.title = title;
		}
		
		// unless we're showing the print version, set up some initial page styles 
		// and event listeners for the UI.
		if ( ShipTrak.isPrint ) {
			$("#wrapper").addClass('print');
			$('.navbar').hide();
			$('body').css({'background': 'transparent'});
		} else {
			$('body').css({
				'overflow': 'hide', 
				'background': '#2e5b7e'
			});
			var mObj = $("#map");
			mObj.css({
                position:'absolute',
				top: '50px',
			    bottom: '0px',
			    overflow: 'hidden'
            });
            $(document).bind("resize", ShipTrak.resizeMap);
		}
	
		// initialize the map elements
		ShipTrak.resizeMap();
        ShipTrak.makeMap();	
	
		// if we're not showing the print version, add the log control
		if ( ShipTrak.isPrint ) {
			$('#log_control').hide();
        } else {
			$("#log").hide();
	        $("#log_toggle").attr('disabled', true);
    		$('#id_callsign').focus();
        }

	    var isReady = window.setInterval(function() {
            if (ShipTrak.isReady == false) {
                return;
            }
            window.clearInterval(isReady);

    		if ( ShipTrak.args['filter'] ) {
                $("#id_filter").val(ShipTrak.args['filter']);
    		}

			if (! ShipTrak.isPrint) {
	            $("#log_control").fadeIn('fast');
			}
    	
    		// The interface is all set, so now go get some data
    		if ( ShipTrak.args['callsign'] ) {
    			$('#id_callsign').val(ShipTrak.args['callsign']);
    			if ( callback ) {
    				callback();
    			}
    		}
        }, 250);
	}
	
	
	// Use AJAX to retrieve position reports for a given callsign.
	//
	ShipTrak.load = function() {
	
		ShipTrak.cancelPlot = 1;
	
		// no callsign?  no data!
		var callsign = $('#id_callsign').val() || args['callsign'];
		if ( ! callsign ) {
			alert("Please enter a callsign.");
			return;
		}
	
		var filter = $('#id_filter').val();
	
		// Change the map header to read 'Loading...'
		if ( ShipTrak.isEmbedded ) {
			var mapTitle = $('#embeddedLabel');
		} else {
			var mapTitle = $('#mapTitle');
		}

        $("#loading_img").show();
	
		// set up the ajax event handler
        $.ajax({
            method: "GET",
            url: "/positions/?callsign="+callsign+"&filter="+filter,
            error: function(res) {
                $("#loading_img").hide();
                ShipTrak.showError(res.statusText);
                console.log(res);
            },
            success: function(res) {
                if ( ShipTrak.isEmbedded ) {
					var mapTitle = $('#embeddedLabel');
				} else {
					var mapTitle = $('#mapTitle');
				}
                $("#loading_img").hide();
	
		        ShipTrak.plotted=0;
	        	ShipTrak.cancelPlot=0;
			    ShipTrak.logData = '';
			    ShipTrak.points = new Array();

			    if (res['error']) {
                    $("#log_header").html("Error: " + res['error']);
			        return;
			    } else if (res['positions'].length == 0) {
				    $("#log_header").html("No positions found for "+callsign + ( filter>0 ? " in the last "+filter+" days." : '.' ));
			        return;
			    }
                $("#log_toggle").attr('disabled', false);
                $("#log_header").html(
                    res['positions'].length + ' Log Entr' + (res['positions'].length > 1 ? "ies" : "y")
                );

			    for (var i=0; i<res['positions'].length; i++) {
			        var p = res['positions'][i];
			        var tPoint = new trakPoint(
			            new google.maps.LatLng( parseFloat(p['lat']), parseFloat(p['lon']) ),
			            p['comment'],
			            new Date(parseInt(p['date'])),
	                    ShipTrak.dd2dms(p['lat'], true) + " / " + ShipTrak.dd2dms(p['lon'], false)
			        );
			        ShipTrak.points.push(tPoint);
			        ShipTrak.logData += "<tr><td align='right' nowrap='1' >"+(i+1)+"</td><td nowrap='1'>"+tPoint.date+"</td><td nowrap='1'>"+tPoint.position+"</td><td>"+tPoint.comment+"</td></tr>";
			    }
			
	
				// Reset the map to default zoom and type, removing any existing markers.
				ShipTrak.reset(function() {
					if ( ShipTrak.isEmbedded ) {
						var mapTitle = $('#embeddedLabel');
					} else {
						var mapTitle = $('#mapTitle');
					}
		
					// add the log data to the page
                    var t = $("#log_table");
                    t.html("");
                    t.append("<tr><th align='right'>Entry</th><th align='left'>Date</th><th align='left'>Position</th><th width='*' align='left'>Comment</th></tr>");
                    t.append(ShipTrak.logData);

					// start the animation at the first point
					ShipTrak.map.panTo(ShipTrak.points[0].latlng);
					if ( ShipTrak.isPrint ) {
						ShipTrak.plot();
					} else {
						window.setTimeout("ShipTrak.plot()",ShipTrak.plotSpeed);
					}
				});
            }, 
        });
	}
	
	// Step through the points() array, creating overlays on the map, 
	// with a recursive call via setTimeout() to 'animate' the points.
	ShipTrak.plot = function() {
	
		// If we've plotted all the points, or if a new callsign has 
		// been loaded before our animation is done, stop plotting.
		//
		if ( ShipTrak.plotted == ShipTrak.points.length || ShipTrak.cancelPlot ) {
			//map.setMapType(oldMapType);
			ShipTrak.cancelPlot=0;
			ShipTrak.plotted=0;
			if ( ShipTrak.isPrint ) setTimeout( "window.print()",1000 );
			return;
		}
	
		if (ShipTrak.plotted > 0) {
			var prev = ShipTrak.points[ShipTrak.plotted - 1];
			prev.marker.setMap(null);
			ShipTrak.createMarker(prev, ShipTrak.plotted,  STATIC_URL + 'img/point_red.png');
			ShipTrak.map.panTo(prev.latlng);
		}
	
		// create the marker
		ShipTrak.createMarker(ShipTrak.points[ShipTrak.plotted], ShipTrak.plotted + 1,  STATIC_URL + 'img/sailboat.png');
	
		// set the timeout to do the next point
		ShipTrak.plotted++;
		if ( ShipTrak.isPrint ) {
			ShipTrak.plot();
		} else {
			window.setTimeout("ShipTrak.plot()",ShipTrak.plotSpeed);
		}
	}
	
	
	ShipTrak.parseQueryString = function() {
		var queryPos = window.location.href.indexOf('?'); //.substring(1);
		if ( queryPos == -1 ) {
            return;
        }
		var query = window.location.href.substr(queryPos+1);
		var vars = query.split("&");
		for (var i=0;i<vars.length;i++) {
			var pair = vars[i].split("=");
			if (pair[0]) {
                ShipTrak.args[pair[0]] = pair[1];
            }
	  	} 
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
	
	// open a near-fullscreen browser window
	ShipTrak.openFull = function() {
		var url = window.location.href;
		url += ( url.indexOf('?') > -1 ? '&' : '?' ) + '_m=f';
		if (navigator.appName == "Microsoft Internet Explorer") { 
			window.open(url, '', 'fullscreen=yes, scrollbars=no, resizable=yes').focus();
		} else { 
			window.open(url, '', 'width='+(screen.width-5)+',height='+(screen.height-30)+',scrollbars=auto').focus();
		}
	}
	
	// open a browser window with a printable version of the map
	ShipTrak.printVersion = function() {
		var url = window.location.href;
		url += ( url.indexOf('?') > -1 ? '&' : '?' ) + '_p=1';
		window.open(url,"","width=600,height=400");	
	}
	
	
	// display the sharing options in an overlay dialog
	ShipTrak.showShare = function() {
		var callsign 	= $('#id_callsign').value;
		var url = window.location.href;
		var embed = "<iframe id='shiptrakIframe' style='width:300px;height:300px;border:1px solid #000' "+ 
					"src'"+url+"&embedded=1' frameborder='0' framespacing='0'>";
        var email = 'mailto:?subject=ShipTrak Report For ' + callsign + '&body=' + url;

		popup($("#SharePopup").html(), "Share This Map", 320, 320);
        $(".share_url").val(url);
        $(".share_iframe").val(embed);
        $(".share_email").attr('href', email);
	}
	
	// display the about overlay dialog
	ShipTrak.showAbout = function() {
		var html = "<center><a href='http://mmsn.org' target='_blank'><img src='" + STATIC_URL + "img/mmsn-logo1a.gif' border='0' /></a>" + 
			"<p><b>ShipTrak v3.0</b><br />" + 
			"by <a href='http://automagick.us' target='_blank'>Automagickus</a></p></center>" + 
			"<p>ShipTrak is a free service of the <a href='http://mmsn.org' target='_blank'>Maritime Mobile Service Network</a>.  " + 
			"We gratefully acknowledge the participation of <a href='http://winlink.org' target='_blank'>Winlink 2000</a> " + 
			"and <a href='http://pangolin.co.nz/' target='_blank'>Yotreps</a>.  " + 
			"Website icons courtesy <a href='http://www.pinvoke.com/' target='_blank'>Yusuke Kamiyamane</a>.  " + 
			"Powered by <a href='http://google.com' target='_blank'>Google</a>.</p>" + 
			"<p>Your administrator is <a href='mailto:ve3ii@mmsn.org?subject=shiptrak%202%20question'>Tom VE3II</a>.</p>" + 
			"<p><a rel='license' href='http://creativecommons.org/licenses/by-sa/3.0/us/'><img alt='Creative Commons License' style='border-width:0;margin:2px;float:left;' src='http://i.creativecommons.org/l/by-sa/3.0/us/88x31.png'/></a><span xmlns:dc='http://purl.org/dc/elements/1.1/' href='http://purl.org/dc/dcmitype/InteractiveResource' property='dc:title' rel='dc:type'>ShipTrak</span> is licensed under a <a rel='license' href='http://creativecommons.org/licenses/by-sa/3.0/us/'>Creative Commons Attribution-Share Alike 3.0 United States License</a>.</p>";
			
		popup(html, "About ShipTrak", 320);
	}

	// display an overlay dialog -- used by showAbout() and showShare()
	function popup(html,title,x,y) {
	    var wPos = getFrameCenter(top);
	    var posX = x ? Math.round( wPos[0] - ( x / 2 ) ) : wPos[0];
	    var posY = y ? Math.round( wPos[1] - ( y / 2 ) ) : wPos[1];
	
	    var popup = $('#OverlayPopup');
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
	
		popup.css({
            'margin': 0,
	        'top': posY ? posY+'px' : '0px',
	        'left': posX ? posX+'px' : '0px',
        });
	    if ( x ) popup.width(x);
	    if ( y ) popup.height(y);
	
	    popup.html(
            "<div id='popup_header'>" + title + "</div>" + 
            "<div id='popup_closer'><a onclick='closePopup(event);'><span class='glyphicon glyphicon-remove-sign'></span></a></div>" + 
            "<div class='clearfix' id='popup_content'>" + html + "</div>");
		popup.show();
	
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

    ShipTrak.init();

	// set up the UI controls to be added to the map
    $("#map_form").submit(function() {
        e.preventDefault();
        ShipTrak.load();
        return false;
    });
});
