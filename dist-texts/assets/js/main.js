angular.module("DistText", ["ngSanitize", "ngRoute", 'FileSaver', 'firebase'])

.constant("CONS", {
    api: {
		rooturl: "https://mediclassics.kr/api/books/",
		conf : {
			headers : {
				"Authorization": "5fe23edf9dec4c718e188073e46274bd",
				// "Content-Type": "application/json;charset=utf-8"
                "Content-Type": "application/json"
			},
            data: ""
            // 이게 없으면 Content-Type이 설정되지 않음 // https://stackoverflow.com/questions/24895290/content-type-header-not-being-set-with-angular-http
		}
	},
    booklist : [
        { 'name': '동의보감', 'id': '8'}
    ]
})

.config(['$compileProvider', function ($compileProvider) {
      $compileProvider.debugInfoEnabled(false);
}])

.config(function ($httpProvider) {
    // $httpProvider.defaults.useXDomain = true;
	// delete $httpProvider.defaults.headers.common['X-Requested-With']
	$httpProvider.defaults.headers.common['Accept'] = "*/*";
	// $httpProvider.defaults.headers.common['Authorization'] = "ae9e82611a2d4f01a388da29e3e479d5";
	// $httpProvider.defaults.headers.common['Content-type'] = "application/json;charset=utf-8" ;
}) // http://blog.nekoromancer.kr/2014/12/16/angularjs-http-%ED%95%A8%EC%88%98-cors-%EC%84%A4%EC%A0%95/

.config(function($routeProvider, $locationProvider) {
    $routeProvider
        .when('/Book/:bookId', {
            templateUrl: 'views/book.html',
            controller: 'BookDownloadCtrl',
        })
        .otherwise({redirectTo: '/'});
    // $locationProvider.html5Mode(true);
})

.factory("countDownloads", ["$firebaseObject", function($firebaseObject) {
    return function( bookId ) {
      // create a reference to the database node where we will store our data
      var ref = new Firebase("https://dist-texts.firebaseio.com/");
      var profileRef = ref.child( bookId );
      // return it as a synchronized object
      return $firebaseObject(profileRef);
    }
  }
])

.controller("DistCtrl", function($scope, $http, $route, CONS){
    $scope.targetBooks = CONS.booklist
})

.controller("BookDownloadCtrl", function ( $scope, $http, $rootScope, $location, $anchorScroll, $routeParams, saveAs, countDownloads, CONS ) {

	$rootScope.$on('$routeChangeSuccess', function (event, current, previous) {
		console.log("Route change success")
	})

	// Init variables
    $scope.targetBook = CONS.booklist.filter(function(book){return book.id === $routeParams.bookId})[0]
    $scope.targetBook['url'] = "https://mediclassics.kr/books/" + $scope.targetBook.id
	$scope.targetBook['VolUrl'] = CONS.api.rooturl + $scope.targetBook.id + "/volumes/"
	countDownloads( $scope.targetBook.id ).$bindTo($scope, "counter");

	var eolList = [
		{'symbol': 'LF', 'string': "\n"},
		{'symbol': 'CRLF', 'string': "\r\n"}
	]
	$scope.eol = eolList[1]

	// Set functions
    function onFlag(process, idx){
        if(idx){
            $scope[process][idx] = true
        } else {
            $scope[process] = true
        }
    }

    function offFlag(process, idx){
        if(idx){
            $scope[process][idx] = false
        } else {
            $scope[process] = false
        }
    }

	function count(volIdx, counter){
		// var volIdxString = String(volIdx)
		var volIdxString = volIdx
		counter[volIdxString] = counter[volIdxString] || 0
		counter[volIdxString]++
	}

	// logic start

    onFlag("bookListLoading")
	$http.get($scope.targetBook.VolUrl , CONS.api.conf ).then( get_VolList, fail)

    function get_VolList( res ){
        $scope.volList = res.data.DATA
        offFlag("bookListLoading")
    }

	$scope.eventfinished = function(){
		$location.hash('mybook'); $anchorScroll();
	}

    function fail( res ){
		console.log( res )
        offFlag("bookListLoading")
	}

    function downloadTxt(content, filename){
        var blob = new Blob([content], { type:"text;charset=utf-8;" });
		// var address = (window.URL || window.webkitURL).createObjectURL( blob );
    	// var a = angular.element("<a>").attr("href", address).attr("download", filename).appendTo("body");
    	// a[0].click(); a.remove();

		// IE에서 download attr을 인식하지 않아 FileSaver library를 이용함
		saveAs(blob, filename)
    }

    function makeTxt( jsonDatas, sep ){
        return jsonDatas
        .sort( function(a,b){ return a.content_seq - b.content_seq })
        .reduce( function(prevVal, lineJson, cIdx, arr){
            var lineText = lineJson.content_level + lineJson.content_level_depth + "\t" + lineJson.original + sep.string;
            return prevVal + lineText
        }, "")
    }

    function downloadDate(){
        return (new Date()).toISOString().slice(0,10).replace(/-/g,"")
    } // https://stackoverflow.com/questions/3066586/get-string-in-yyyymmdd-format-from-js-date-object

    function defaultheader(targetBook, sep){
		return "// 이 파일은 한국한의학연구원에서 " + targetBook.name + " 원문을 디지타이즈하여 배포한 것입니다. " + sep.string
        + "// File Info: { encoding: 'UTF-8', end_of_line: '" + sep.symbol + "' }" + sep.string
        + "// 다운로드 일시: " + downloadDate() + sep.string
        + sep.string
	}

    $scope.setEol = function( eol ){
        if(eol==="LF"){
            $scope.eol = eolList[0];
        } else {
            $scope.eol = eolList[1];
        }
    }

    $scope.dnIdx = []
    // $scope.bookDownloading = []

    $scope.dnTxt = function( volIdx, volname, lastIdx, dnIdx ){
        if(!confirm("위 [사용권한]에 동의하며\n다운로드를 계속 하시겠습니까?\n(1-2분 정도 소요됩니다)")){return}

        $scope.dnIdx[dnIdx] = true
        // onFlag("bookDownloading", dnIdx)

        var downloadUrl = $scope.targetBook.VolUrl + volIdx + "/" + "contents?begin=1&end=" + lastIdx
        console.log( downloadUrl )
        var downloadedFileName = ( $scope.targetBook.name + " " + volname + "(" + downloadDate() + ")"+ ".txt" ).replace(/\s+/g, "_")

		$http.get( downloadUrl, CONS.api.conf )
		.then( function(res){
            var jsonDatas = res.data.DATA
            downloadTxt( defaultheader($scope.targetBook, $scope.eol) + makeTxt(jsonDatas, $scope.eol), downloadedFileName )
			count(volIdx, $scope.counter)
            $scope.dnIdx[dnIdx] = false
            // offFlag("bookDownloading", dnIdx)
        }, function(res){
			console.log( res )
			$scope.dnIdx[dnIdx] = false
			// offFlag("bookDownloading", dnIdx)
		})
    }

});
