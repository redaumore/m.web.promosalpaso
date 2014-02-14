/*
  Variables guardadas en Session:
    -activePromotion
    -lastSearch
*/
var _lat;
var _lng;
var _promo_lat;
var _promo_lng;
var _baseServUri = _baseUri + "services/";
var _baseAjaxUri = _baseUri + "backendajax/";
var _activePromo;
var _firstAttemp = true;
var _firstAttempFav = true;
var _inFavorites = false;
var _last_update;
var _searchOrigin = "GPS"; /*CITY, FAV*/
var _current_page = -1;
var _txt_consolelog = "";
var _uuid;
//document.addEventListener("deviceready", function(){
$(function(){
	consolelog("calling onDeviceReady");
	onDeviceReady();
});

function refreshPromoList(){
	_searchOrigin = "GPS";
	showMessage("Buscando promos...");
	navigator.geolocation.getCurrentPosition(onSuccessPromoList, 
	        onError, 
	        {maximumAge:3000, timeout:6000, enableHighAccuracy: true});
}

function onSuccessPromoList(position) {
	if(position.coords.accuracy <= 150){
		_lat = position.coords.latitude;
		_lng = position.coords.longitude;
		jQuery("#_lat").val(_lat);
		jQuery("#_lng").val(_lng);
		consolelog("Geoposition: "+_lat+", "+_lng+" +/- "+position.coords.accuracy);
		loadPromoList(0);
	}
	else{
		if(environment == "DEV")
			loadPromoList(0);
		else{
			consolelog("Accuracy: "+position.coords.accuracy);
			onError("");
		}
	}
	startWatchPosition();
};

function getGeoLocation(){
	navigator.geolocation.getCurrentPosition(onSuccess, 
	        onError, 
	        {maximumAge:3000, timeout:10000, enableHighAccuracy: true});
}

function onSuccess(position){
	if(position.coords.accuracy <= 150){
		_lat = position.coords.latitude;
		_lng = position.coords.longitude;
		jQuery("#_lat").val(_lat);
		jQuery("#_lng").val(_lng);
		consolelog("Geoposition: "+_lat+", "+_lng+" +/- "+position.coords.accuracy);
		hideMessage();
	}
	else{
		consolelog("getGeoLocation -> LOW ACCURACY: "+position.coords.accuracy);
		onError("");
	}
	
}
//onError Callback receives a PositionError object
function onError(error) {
	hideMessage();
	if(error.code === undefined){
		showMessage('La información del GPS tiene baja precisiÃ³n. Te sugerimos buscar por ciudad.', 3500);
	}
	else{
		if(error.code === "PERMISSION_DENIED")
			showMessage('Acceso denegado al GPS. Te sugerimos buscar por ciudad.', 3500);
		if(error.code === "POSITION_UNAVAILABLE")
			showMessage('El GPS no entrega informaciÃ³n. Te sugerimos buscar por ciudad.', 3500);
		if(error.code === "TIMEOUT")
			showMessage('El GPS no entrega responde a tiempo. Te sugerimos buscar por ciudad.', 3500);
		
	}
	if(environment == "DEV"){
	    consolelog("Se toma valor por defecto: San Justo");
	    _lat = "-34.681774410598"; 
	    _lng = "-58.561710095183" ;
	    jQuery("#_lat").val(_lat);
        jQuery("#_lng").val(_lng);
        loadPromoList(0);
	}
	
}

function loadPromoList(page){
	$.ajax({
        url: _baseServUri + 'getpromolist',
        dataType: 'jsonp',
        data: {"lat": _lat,
               "lng": _lng, 
               "cat": window.localStorage.getItem("selected_categories"),
               "mobile_uuid": getuuid(),
               "page": page},
        jsonp: 'jsoncallback',
        contentType: "application/json; charset=utf-8",
        timeout: 10000,
        beforeSend: function (jqXHR, settings) {
            consolelog(settings.url);
        },
        success: function(data, status){
                consolelog("loadPromoList: llamada a servicio exitosa. data.length:"+data.data.length);
                window.localStorage.setItem("lastSearch", JSON.stringify(data));
                if(data.data[0].total == 0){
                	hideMessage();
                    if(jQuery.mobile.activePage[0].id == "main"){
                        showMessage('No se encontraron promos. Intenta nuestra bÃºsqueda por dirección.', 3500);
                        event.preventDefault();
                        gotoSearch();
                        return;
                    }
                    else
                    	if(jQuery.mobile.activePage[0].id == "search"){
	                        showMessage('No se encontraron promos activas para esta dirección. Intenta con otra.', 3500);
	                        return;
                    	}
                }
                var count_promolist = 0;
                var promolist = "";
                var total = data.data[0].total;
                $.each(data.data[0].json, function(i,item){
                    promolist += getPromoRecord(item);
                });
                if(page == 0){
                	jQuery("#promolist").empty().html(promolist).trigger("create");
                	count_promolist = jQuery('#promolist li').size();
                	if(total > count_promolist)
                		jQuery('#promolist').append(getLastItem(page+1));
                	jQuery.mobile.changePage(jQuery("#one"));
                }
                else{
                	jQuery("#promolist li").eq(jQuery("#promolist").children().size()-1).remove();  
                	jQuery('#promolist').append(promolist);
                	count_promolist = jQuery('#promolist li').size();
                	if(total > count_promolist)
                		jQuery('#promolist').append(getLastItem(page+1)).listview('refresh');
                	else
                		jQuery('#promolist').listview('refresh');
                	jQuery('#promolist li').removeClass("ui-li-static");
                }
        },
        error: function(jqXHR, textStatus, errorThrown){
        	if(jqXHR.responseText != null)
        		consolelog("AJAX ERROR -> LoadPromoList(responseText): "+jqXHR.responseText);
        	else
        		consolelog("AJAX ERROR -> LoadPromoList(status): "+textStatus);
        	         	
            hideMessage();
	        showMessage('Error en el servicio. Por favor intentalo en unos minutos...', 3500);
	    }
    });
}

function loadPromoListByIds(ids, fromFavoritos){
	$.ajax({
        url: _baseServUri + 'getpromolistbyids',
        dataType: 'jsonp',
        data: {"ids": ids, 
               "lat": _lat, 
               "lng": _lng},
        jsonp: 'jsoncallback',
        contentType: "application/json; charset=utf-8",
        timeout: 10000,
        beforeSend: function (jqXHR, settings) {
            consolelog("Favoritas: "+ settings.url + "?" + settings.data);
        },
        success: function(data, status){
                if(data.length != 0){
                	var promolist = "";
                	var newfavoritos = "";
                	oldfavoritos = ids.split(",");
                	$.each(data, function(i,item){
                        promolist += getPromoRecord(item);
                        if(fromFavoritos){
                        	for(i=0;i<oldfavoritos.length;i++){
                        		if(oldfavoritos[i]==item.promotion_id)
                        			newfavoritos += item.promotion_id+",";
	                        }	
                    	}
                    });
            	    if(fromFavoritos)
            	    	window.localStorage.setItem("favoritos", newfavoritos);
                	jQuery("#promolist").html(promolist);
                    $.mobile.changePage(jQuery("#one"));
                }
                else{
                	hideMessage();
                	showMessage('No se ha podido cargar Tus Favoritas.', 3500);
                }
        },
        error: function(jqXHR, textStatus, errorThrown){
	    	hideMessage();
	        showMessage('Hubo un error recuperando las favoritas. Por favor intentalo mÃ¡s tarde...', 3500);
            
        },
    });
}

function getPromoRecord(promo){
    var liString = getLiString();
    liString = liString.replace("#ID#", promo.promotion_id);
    if(promo.path != "NOPIC")
    	liString = liString.replace("#IMAGE#", promo.logo);
    else
    	liString = liString.replace("#IMAGE#", promo.logo);
    liString = liString.replace("#COMERCIO#", promo.name);
    liString = liString.replace("#DESCRIPCION#", promo.short_description);        
    liString = liString.replace("#PROMO#", promo.displayed_text);
    liString = liString.replace("#PRECIO_DESDE#", (promo.value_since != null)?"inline":"none");
    liString = liString.replace("#PRECIO#", (promo.is_percentage == "1")?formatPercentageItem(promo.promo_value):formatPriceItem(promo.promo_value));
    if(_searchOrigin == "GPS")
    	liString = liString.replace("#DISTANCIA#", promo.distance);
    return liString;
}

function gotoPromo(id_promotion){
	showMessage("Cargando promo...");
    window.localStorage.setItem("activePromotion", id_promotion);
    callPromoDetail(id_promotion);
}

function getPamarByName(url, paramName){ 
    var strGET = url.substr(url.indexOf('?')+1,url.length - url.indexOf('?')); 
    var arrGET = strGET.split("&"); 
    var paramValue = '';
    for(var i=0;i<arrGET.length;i++){ 
          var aux = arrGET[i].split("="); 
          if (aux[0] == paramName){
                paramValue = aux[1];
          }
    } 
    return paramValue;
}

function callPromoDetail(promotion_id){
    var promotion_detail = "";
    $.ajax({
        url: _baseServUri + 'getpromodetail',
        dataType: 'jsonp',
        data: {"lat": _lat,
               "lng": _lng, 
               "promoid": promotion_id},
        jsonp: 'jsoncallback',
        contentType: "application/json; charset=utf-8",
        timeout: 10000,
        beforeSend: function (jqXHR, settings) {
            url = settings.url + "?" + settings.data;
        },
        success: function(data, status){
                loadPromoDetail(data);
                zoom = null;
                $.mobile.changePage(jQuery("#detail"));
        },
        error: function(jqXHR, textStatus, errorThrown){
        	hideMessage();
            showMessage('Hubo un error accediendo a los datos de la Promo. Por favor intenta mÃ¡s tarde...', 3500);
        }
    });
    return promotion_detail;
}

function loadPromoDetail(item){
	var local = '';
	local = (item.local!=''?' - '+(item.local.length>3?item.local:'Local '+item.local):'');
    jQuery("#det-name").html(item.name);
    jQuery("#det-long_description").html(item.long_description);
    jQuery("#det-displayed_text").html(item.displayed_text);
    jQuery("#det-short_description").html(item.short_description);
    if(item.is_percentage == "0"){
    	jQuery("#det-promo_value").html(formatPrice(item.promo_value));
    	jQuery("#det-promo_value").removeClass("porcentaje").addClass("precio");
    }
    else{
    	jQuery("#det-promo_value").html(formatPercentage(item.promo_value));
    	jQuery("#det-promo_value").removeClass("precio").addClass("porcentaje");
    }
    
    jQuery("#det-distance").html(item.distance);
    jQuery("#det-direccion").html(item.street + ' ' + item.number + local + ' - ' + item.city);
    jQuery("#det-img-comercio").attr("src",item.logo);
    if(item.branch_website != null && item.branch_website != "" ){
        jQuery("#det-link").attr("href", "#");
        var web = item.branch_website;
        web = (web.indexOf("http:")!=-1)?web:"http://"+web;
    	jQuery("#det-link").attr("onclick", "window.open('"+web+"', '_blank');");
    }
    else
        jQuery("#det-web").hide();
    
    if(item.phone != null && item.phone != "")
        jQuery("#det-phone").attr("href", "tel:"+item.phone);
    else
        jQuery("#det-tel").hide();
    
    if(item.branch_email != null && item.branch_email != ""){
        jQuery("#det-msg").attr("href", "mailto:"+item.branch_email+"?subject=Promos al Paso: Consulta por promo "+item.promo_code);
        jQuery("#det-msg").attr("target", "_blank");
    }
    else
        jQuery("#det-email").hide();
    
    if(item.path != "NOPIC")
    	jQuery("#det-img-promo").attr("src",item.path);
    else
    	jQuery("#det-img-promo").attr("src","images/photo_error.png");
    
    if(item.alert_type == "N"){
        jQuery("#det-alarma").hide();
    }
    else{
        if(item.alert_type == "Q"){
            jQuery("#det-alarm_num").html(item.quantity);
            jQuery("#det-alarm_type").html("unids");
        }
        else{
            today=new Date();
            ends = new Date(item.ends);
            var one_day = 1000*60*60*24;
            days = Math.ceil((ends.getTime()-today.getTime())/(one_day));
            jQuery("#det-alarm_num").html(days);
            jQuery("#det-alarm_type").html("días");
        } 
    }
    if(_searchOrigin == "GPS")
    	jQuery("#det-distance").show();
    else
    	jQuery("#det-distance").hide();
    if(item.value_since == "1")
        jQuery("#precio_desde").show();
    else
        jQuery("#precio_desde").hide();
    if(isFavorite(item.promotion_id)){
        jQuery("#favtext").html("Quitar de Favoritos");
        jQuery("#linkFavorite").unbind("click");
        jQuery("#linkFavorite").click(function(){frontDeleteFavorite(item.promotion_id);});
    }
    else{
        jQuery("#favtext").html("Agregar a Favoritos");
        jQuery("#linkFavorite").unbind("click");
        jQuery("#linkFavorite").click(function(){saveFavorite();});
    }
    jQuery("#barmaspromos").html("+ promos de "+item.name);
    _promo_lat = item.latitude;
    _promo_lng = item.longitude;
}

function saveFavorite(){
    var located = false;
    var favoritos = window.localStorage.getItem("favoritos");
    var activePromo = window.localStorage.getItem("activePromotion");
    if (favoritos != null){
        var arrFav = favoritos.split(",");
        for(var i = 0; i < arrFav.length; i++){
            if(arrFav[i] == activePromo)
                located = true;
        }
        if(!located)
            favoritos = favoritos + activePromo + ",";
    }
    else{
        favoritos = activePromo + ",";
    }
    window.localStorage.setItem("favoritos", favoritos);
    showMessage("La promo se ha agregado a tus favoritos.", 3500);    
}

function deleteFavorite(id){
    var fav = window.localStorage.getItem("favoritos");
    if(fav == null)
        return;
    arrFav = fav.split(",");
    for(var i=0; i<arrFav.length; i++){
        if(arrFav[i] = id)
            arrFav.splice(i, 1);
    }
    if(arrFav.toString()=="")
        window.localStorage.removeItem("favoritos");
    else
        window.localStorage.setItem("favoritos", arrFav.toString()+",");
}

function frontDeleteFavorite(id){
	deleteFavorite(id);
	showMessage("La promo se ha eliminado de tus favoritos.", 3000);
	gotoFavoritos();
	
}

function isFavorite(id){
    var fav = window.localStorage.getItem("favoritos");
    if(fav == null)
        return false;
    arrFav = fav.split(",");
    for(var i=0; i<arrFav.length; i++){
        if(arrFav[i] == id)
            return true;
    }
    return false;
}

function gotoFavoritos(){
    var favoritos = window.localStorage.getItem("favoritos");
    if(favoritos != null)
        if(favoritos != ""){
        	showMessage("Recuperando favoritas...");
            _inFavorites = true;
            loadPromoListByIds(favoritos.substring(0, favoritos.lastIndexOf(",")), true);
            return;
        }
    $.mobile.changePage(jQuery("#main"));
    showMessage('No tienes favoritos.', 3000);
}

// Function called when phonegap is ready
function setFullScreen() {
    //All pages at least 100% of viewport height
    var viewPortHeight = jQuery(window).height();
    var headerHeight = jQuery('div[data-role="header"]').height();
    var footerHeight = jQuery('div[data-role="footer"]').height();
    var contentHeight = viewPortHeight - headerHeight - footerHeight;

    // Set all pages with class="page-content" to be at least contentHeight
    jQuery('div[class="ui-content"]').css({'min-height': contentHeight + 'px'});
 }

function getLiString(){
var liString = new String();
	//liString = '<li data-corners="false" data-shadow="false" data-iconshadow="true" data-wrapperels="div" data-icon="arrow-r" data-iconpos="right" data-theme="a" class="ui-btn ui-li-has-arrow ui-li ui-li-has-thumb ui-btn-up-a ui-li-static"  style="padding: 0px; border: 1px solid #666666">';
	liString = '<li class="li-promoitem">';
	//liString += '   <div class="ui-btn-inner ui-li ui-li-static ui-btn-up-a" style="padding: 0px;">';
	liString += '       <div class="ui-btn-text registro">';
	liString += '           <a href="#" data-transition="slide" onclick="gotoPromo(#ID#);">'; //<a href="#ID#">';
	liString += '               <table class="aviso">';
	liString += '                  <tr>';
	liString += '                     <td class="lst-image">';
	liString += '                        <img src="#IMAGE#" class="shadow image" style="margin-left: 2px;"/>';
	liString += '                     </td>';
	liString += '                     <td style="border-right: solid 1px #9CAAC6;">';
	liString += '                        <p class="ui-li-desc comercio">#COMERCIO#</p>';
	liString += '                        <div class="descripcion ui-li-desc det-font-oscuro">#DESCRIPCION#</div>';
	liString += '                        <p class="lst-promo ui-li-desc">#PROMO#</p>';
	liString += '                     </td>';
	liString += '                     <td style="width: 45px;">';
	liString += '                        <div style="text-align: center;">';
	liString += '                            <div class="desde" style="display: #PRECIO_DESDE#;">desde</div>';
	liString += '                            #PRECIO#';
	if(_searchOrigin == "GPS")
		liString += '                            <div style="border-top: solid 1px #9CAAC6; vertical-align: middle; text-align: center"><span class="distancia det-font-oscuro">#DISTANCIA#</span></div>';
	liString += '                        </div>';
	liString += '                     </td>';
	liString += '                  </tr>';
	liString += '               </table>';
	liString += '            </a></div></li>';

    return liString;
}

function getLastItem( nextPage){
	var liString = new String();
	liString = '<li class="li-promoitem">';
	liString += '       <div class="ui-btn-text registro">';
	liString += '           <a href="#" data-transition="slide" onclick="loadPromoList('+nextPage+');"><div class="get-more">Traer m\u00e1s Promos</div>'; //<a href="#ID#">';
	liString += '            </a></div></li>';

    return liString;
}

function formatPrice(price){
    var formatedPrice = "";
    if(price.indexOf(".") == -1)
    	return price;
    point = price.indexOf(".00");
    if(point == -1)
        formatedPrice = price.substring(0, price.indexOf(".")) + price.substring(price.indexOf(".")+1, price.length).sup();
    else
        formatedPrice = price.substring(0, price.indexOf("."));
    
    return formatedPrice;
}

function formatPriceItem(price){
	return '<div id="item-promo_value" class="precio">'+formatPrice(price)+"</div>";
}

function formatPercentage(value){
    var formatedPrice = "";
    if(value.indexOf(".") == -1)
    	return price;
    point = value.indexOf(".00");
    if(point == -1)
        formatedPrice = value.substring(0, value.indexOf(".")) + value.substring(value.indexOf(".")+1, value.length).sup();
    else
        formatedPrice = value.substring(0, value.indexOf("."));
    
    return formatedPrice;
}

function formatPercentageItem(value){
	return '<div id="item-promo_value" class="porcentaje">'+formatPercentage(value)+"</div>";
}



//CONFIG
function getRegionsUpdate(){
	consolelog("getRegionsUpdate-last_update: " + _last_update);
    $.ajax({
        url: _baseServUri + 'getregions',
        dataType: 'jsonp',
        data: {"lastupdate": _last_update},
        jsonp: 'jsoncallback',
        contentType: "application/json; charset=utf-8",
        timeout: 15000,
        async: false,
        beforeSend: function (jqXHR, settings) {
            console.log(settings.url);
        },
        success: function(data, status){
            consolelog("getRegionUpdate: llamada a servicio exitosa");
            if(data == null){
                consolelog("No se actualizaron regiones");
                return;
            }
            addRegions(data.province, data.city);
            setLastUpdate(new Date());
        },
        error: function(jqXHR, textStatus, errorThrown){
            consolelog("Error getRegionUpdate: " + textStatus);
        }
    });
}

function addRegions(provinces, cities){
    var db = window.openDatabase("promosalpaso", "1.0", "Promos al Paso", 300000);
    db.transaction(function(tx){populateRegionsDB(tx, provinces, cities);}, errorCB, successCB);
}
function populateRegionsDB(tx, provinces, cities) {
    if(provinces != null ){
         tx.executeSql('CREATE TABLE IF NOT EXISTS province (province_id INTEGER PRIMARY KEY, name, updated DATETIME)');
         $.each(provinces, function(i,item){
            consolelog("populateRegionsDB: actualizando provincia "+item.name);
            tx.executeSql('INSERT INTO province (province_id, name, updated) VALUES ('+item.province_id+',"'+item.name+'","'+item.updated+'")');
         });
     }
     if(cities != null){
         tx.executeSql('CREATE TABLE IF NOT EXISTS city (city_id INTEGER PRIMARY KEY, name, latitude, longitude, province_id INTEGER, updated DATETIME)');
         $.each(cities, function(i,item){
            consolelog("populateRegionsDB: actualizando ciudad "+item.name);
            consolelog('INSERT INTO city (city_id, name, latitude, longitude, province_id, updated) VALUES ('+item.city_id+',"'+item.name+'","'+item.latitude+'","'+item.longitude+'",'+item.province_id+',"'+item.updated+'")');
            tx.executeSql('INSERT INTO city (city_id, name, latitude, longitude, province_id, updated) VALUES ('+item.city_id+',"'+item.name+'","'+item.latitude+'","'+item.longitude+'",'+item.province_id+',"'+item.updated+'")');
         });
     }
}
function errorCB(err) {
    consolelog("errorCB: "+err.message+". Code: "+err.code);
    //alert("Error actualizando ciudades: "+err.code);
}
function successCB(){
	window.localStorage.setItem("last_update", _last_update);
}
function gotoSearch(){
    var db = window.openDatabase("promosalpaso", "1.0", "Promos al Paso", 200000);
    db.transaction(populateProvinceDDL, errorProvinceDDL, successProvinceDDL);
    jQuery('#city_button').hide();
    jQuery.mobile.changePage("#search");
    jQuery.mobile.hidePageLoadingMsg();
}
function populateProvinceDDL(tx){
    tx.executeSql('SELECT province_id, name FROM province ORDER BY name', [], queryProvinceSuccess, errorCB);
}
function successProvinceDDL(){
    
}
function errorProvinceDDL(err) {
        consolelog("errorProvinceDDL: "+err.message+". Code: "+err.code);
    }
function queryProvinceSuccess(tx, results){
    jQuery('#state_select').empty();
    for(var i=0;i<results.rows.length;i++){
        jQuery('#state_select').append('<option value="'+results.rows.item(i).province_id+'">' + results.rows.item(i).name + '</option>');
    }
    jQuery("#state_select option:first").attr('selected','selected');
    jQuery('#state_select').selectmenu("refresh");
    addCites(jQuery('#state_select').val());
    jQuery('#state_select').hide(); /*Cuanto solo hay una provincia lo oculto.*/
}
function addCites(province_id) {
    var db = window.openDatabase("promosalpaso", "1.0", "Promos al Paso", 200000);
    db.transaction(function(tx){populateCityDDL(tx, province_id);}, errorCityDDL, successCityDDL);
}
function populateCityDDL(tx, province_id){
    tx.executeSql('SELECT city_id, name FROM city WHERE province_id = '+province_id+' ORDER BY name', [], queryCitySuccess, errorCB);
}
function successCityDDL(){
    
}
function errorCityDDL(err) {
        consolelog("Error City SQL: "+err.code);
    }
function queryCitySuccess(tx, results){
    jQuery('#city_select').empty();
    for(var i=0;i<results.rows.length;i++){
        jQuery('#city_select').append('<option value="'+results.rows.item(i).city_id+'">' + results.rows.item(i).name + '</option>');
    }
    jQuery("#city_select option:first").attr('selected','selected');     
    jQuery('#city_select').selectmenu("refresh");
    jQuery('#city_button').show();
}

//SEARCH
function doSearch(){
	_searchOrigin = "CITY";
	jQuery("#promolist").empty().html(promolist).trigger("create");
    /*var city_id = jQuery("#city_select option:selected").val();
    if(city_id != null){
    	//jQuery("#promolist").empty(); //jQuery("#promolist").html("");
        var db = window.openDatabase("promosalpaso", "1.0", "Promos al Paso", 200000);
        db.transaction(function(tx){querySearchDB(tx, city_id);}, errorSearchDB);    
    }
    else{
        showMessage("No hay ciudad seleccionada.", 3500);
    }*/
}
function querySearchDB(tx, city_id) {
        tx.executeSql('SELECT * FROM city WHERE city_id = ' + city_id, [], querySearchSuccess, errorSearchDB);
}
function querySearchSuccess(tx, results) {
    len = results.rows.length;
    if(len = 1){
    	showMessage("Buscando promos...");
        _lat = results.rows.item(0).latitude;
        _lng = results.rows.item(0).longitude;
        consolelog("Geoposition search: "+results.rows.item(0).name+" "+_lat+", "+_lng);
        loadPromoList(0);
    }
}
function errorSearchDB(err){
    consolelog("error en la búsqueda de promociones por ciudad: " + err.code);
}

function showPromoImage(){
	showMessage("Cargando imagen...");
	var _promo_id = _last_update = window.localStorage.getItem("activePromotion");
	
	$.ajax({
        url: _baseServUri + 'getpromoimage',
        dataType: 'jsonp',
        data: {"promoid": _promo_id},
        jsonp: 'jsoncallback',
        contentType: "application/json; charset=utf-8",
        timeout: 10000,
        beforeSend: function (jqXHR, settings) {
            url = settings.url + "?" + settings.data;
        },
        success: function(data, status){
        	jQuery("#promo_image").attr("src", data.image);
            $.mobile.changePage(jQuery("#promo-image"));
        },
        error: function(jqXHR, textStatus, errorThrown){
        	jQuery.mobile.hidePageLoadingMsg();
            showMessage('Hubo un error accediendo a la imagen de la Promo. Por favor intenta mÃ¡s tarde...', 3500);
        }
    });
	
}

function sendMessage(){
	var _email = $("#email").val();
	var _message = $("#message").val();
	var _uuid = $.mobile.uuid;
	if(_email == "" || _message == ""){
		showMessage('Email y Mensaje son datos requeridos.', 3500);
		return;
	}
	$.mobile.showPageLoadingMsg('a', "Enviando mensaje...", false);
	$.ajax({
        url: _baseServUri + 'sendMessage',
        dataType: 'jsonp',
        data: {"email": _email,
        	   "message": _message,
        	   "uuid": _uuid,
        	},
        jsonp: 'jsoncallback',
        contentType: "application/json; charset=utf-8",
        timeout: 10000,
        beforeSend: function (jqXHR, settings) {
            consolelog(settings.url);
        },
        success: function(data, status){
        	jQuery.mobile.hidePageLoadingMsg();
            $.mobile.changePage(jQuery("#main"));
        },
        error: function(jqXHR, textStatus, errorThrown){
        	jQuery.mobile.hidePageLoadingMsg();
            showMessage('Hubo un error enviando el mensaje. Por favor intenta mÃ¡s tarde...', 3500);
            $.mobile.changePage(jQuery("#main"));
        }
    });
	$("#email").text("");
	$("#message").text("");
}

function retrieveResponses(){
	$.mobile.showPageLoadingMsg('a', "Recuperando respuestas...", false);
	var _uuid = $.mobile.uuid;
	$.ajax({
        url: _baseServUri + 'retrieveresponses',
        dataType: 'jsonp',
        data: {"uuid": _uuid,},
        jsonp: 'jsoncallback',
        contentType: "application/json; charset=utf-8",
        timeout: 10000,
        beforeSend: function (jqXHR, settings) {
            consolelog(settings.url);
        },
        success: function(data, status){
        	jQuery.mobile.hidePageLoadingMsg();
            $.each(date, function(i,item){
            	
            });
        },
        error: function(jqXHR, textStatus, errorThrown){
        	jQuery.mobile.hidePageLoadingMsg();
        }
    });
}

function gotoContact(){
	//retrieveResponses();
	$.mobile.changePage(jQuery("#contact"));
}

function consolelog(message){
	if(environment == "DEV"){
		$("#txt_consolelog").prepend(message + "<br/><br/>");
		len=$("#txt_consolelog").text().length;
	    if(len>1000)
	    {
	      $("#txt_consolelog").text($("#txt_consolelog").text().substr(0,1000)+'...');
	    }
	}
	console.log(message);
}

function getPromosByAddress(){
	showMessage("Buscando Promos...");
	var getCoordsUrl = "http://maps.google.com/maps/api/geocode/json?address="+jQuery("#street").val()+" "
		+jQuery("#number").val()+","+jQuery("#city_select option:selected").text()+",Buenos Aires, Argentina&sensor=false";
	$.getJSON(getCoordsUrl,function(data){
	    var location = data.results[0].geometry.location;
	    // coordinates are location.lat and location.lng
	    if(data.results[0].geometry.location_type == "APPROXIMATE"){
	    	showMessage("La dirección que ingresaste no existe o es erronea. Inténtalo nuevamente.", 3500);
	    	return;
	    }
	    _lat = location.lat;
		_lng = location.lng;
		jQuery("#_lat").val(_lat);
		jQuery("#_lng").val(_lng);
		loadPromoList(0);
	});
}
