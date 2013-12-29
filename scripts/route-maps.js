
var directionDisplay;
var directionsService; /* = new google.maps.DirectionsService();*/
var map;
var zoom;
var global = {};

function initGmapApi (){
	consolelog("initGmapApi: Google API Loaded");
	directionsService = new google.maps.DirectionsService();
	if(directionsService == null)
		consolelog("initGmapApi: Direction Service not loaded");
};

function initializemap() {
			showMessage("Cargando mapa...");
	  		var mapOptions;
	  		var end = new google.maps.LatLng(_promo_lat, _promo_lng);
	  		mapOptions= {
						center: end,
						zoom: 16,
						mapTypeId: google.maps.MapTypeId.ROADMAP,
						streetViewControl: false,
						mapTypeControl: false,
			 };
				
			map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);
			
			new google.maps.Marker({
				icon: _baseUri + "images/pap_location.png",
		        position: end,
		        map: map,
		    });
			/*
			google.maps.event.addListenerOnce(map, 'idle', function(){
			    //loaded fully
				hideMessage();
				consolelog("initializemap -> GMap idle event fired.");
			});*/
  }
  
  function initializemapgps() {
	  	showMessage("Cargando mapa...");
		var mapOptions;
		var start = new google.maps.LatLng(_lat, _lng);
		var end = new google.maps.LatLng(_promo_lat, _promo_lng);
		mapOptions= {
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				streetViewControl: false,
				mapTypeControl: false,
		};
		
		map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);	
		/*
		google.maps.event.addListenerOnce(map, 'idle', function(){
		    //loaded fully
			hideMessage();
			consolelog("initializemapgps -> GMap idle event fired.");
		});
		*/
		var rendererOptions = {
				  map: map,
				  suppressMarkers : true
		};
		 
		directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);// also, constructor can get "DirectionsRendererOptions" object
		directionsDisplay.setMap(map); // map should be already initialized.
		
		request = {
			    origin:start,
			    destination:end,
			    travelMode: google.maps.TravelMode.WALKING
		};
		if(directionsService == null)
			directionsService = new google.maps.DirectionsService();
		directionsService.route(request, function(response, status) {
	        if (status == google.maps.DirectionsStatus.OK) {
	            directionsDisplay.setDirections(response);
	        }
	    });
		
		new google.maps.Marker({
			icon: _baseUri + "images/pap_location.png",
	        position: end,
	        map: map,
	    });
		
		new google.maps.Marker({
			position: start,
			icon: _baseUri + "images/pap_smile.png",
	        map: map,
	    });
}

  jQuery(document).delegate( "#page-map", "pagebeforeshow", function(event){
		event.preventDefault();
		var _width = jQuery(window).width();
	    var _height = jQuery(window).height() - jQuery("#page-map").find('[data-role="header"]').outerHeight();
	    jQuery("#map_canvas").css({height:_height});
	    jQuery("#map_canvas").css({width:_width});
	    if(_searchOrigin == "GPS")
	    	initializemapgps();
	    else
	    	initializemap();
	    //calcRoute();
	});

	jQuery(document).delegate( "#page-map", "pageshow", function(event){
		var lastCenter=map.getCenter();
		google.maps.event.trigger(map, "resize");
		map.setCenter(lastCenter);
		
		if(_searchOrigin == "GPS"){
			var start = new google.maps.LatLng(_lat, _lng);
			var end = new google.maps.LatLng(_promo_lat, _promo_lng);
			var bounds = new google.maps.LatLngBounds();
			bounds.extend(start);
			bounds.extend(end);
			map.fitBounds(bounds);
		}
		
	});

  
  
  function calcRoute() {
	  		var request = "";
	  		var start = new google.maps.LatLng(_lat, _lng);
			var end = new google.maps.LatLng(_promo_lat, _promo_lng);
			if(_searchOrigin == "GPS"){
				new google.maps.Marker({
					position: start,
					icon: _baseUri + "images/pap_smile.png",
			        map: map,
			    });
			}
			
			new google.maps.Marker({
				icon: _baseUri + "images/pap_location.png",
		        center: end,
		        map: map,
		    });
			
			directionsService.route(request, function(response, status) {
				if (status == google.maps.DirectionsStatus.OK) {
					directionDisplay.setDirections(response);
				}
	       });
		   marker = null;
			
  }  

  
