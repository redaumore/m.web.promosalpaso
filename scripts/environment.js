    //var _baseUri = "http://192.168.1.34/";
var _baseUri = "http://dev.promosalpaso.com/";
//var _baseUri = "http://promosalpaso.local/";
var environment = "DEV";
var agent = "WEB";
var _pagesize = 7;

/*SAN JUSTO*/
//var _lat = "-34.681774410598"; //"-34.6463";
//var _lng = "-58.561710095183" ; //"-58.5648";

/*RAMOS MEJIA
var _lat = "-34.6463";
var _lng = "-58.5648";
*/


/* CASANOVA */
  //var _lat = "-34,707320691758";
  //var _lng = "-58,583339428671";

function getuuid(){
	consolelog(navigator.userAgent);
	if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) )
		return $.mobile.uuid;
	else
		return "8218218921892";
}

$(document).bind("mobileinit", function(){
    console.log("mobileinit");
    $.mobile.defaultDialogTransition = "none";
    $.mobile.defaultPageTransition = "none";
    $.mobile.pushStateEnabled = false;
});
