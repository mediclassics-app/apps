angular.module("DistText", ["ngSanitize", "ngRoute", 'FileSaver', 'firebase'])

.constant("CONS", {
    api: {
		rooturl: "https://mediclassics.kr/api/books/",
		conf : {
			headers : {
				"Authorization": "5fe23edf9dec4c718e188073e46274bd",
                "Content-Type": "application/json"
			},
            data: ""
            // 이게 없으면 Content-Type이 설정되지 않음 // https://stackoverflow.com/questions/24895290/content-type-header-not-being-set-with-angular-http
		}
	},
    booklist : [
        { 'name': '동의보감', 'id': '8'}
    ],
    chunkSize: 200,
    requestDelay: 300
})

.config(['$compileProvider', function ($compileProvider) {
      $compileProvider.debugInfoEnabled(false);
}])

.config(function ($httpProvider) {
	$httpProvider.defaults.headers.common['Accept'] = "*/*";
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

.controller("BookDownloadCtrl", function ( $scope, $http, $rootScope, $location, $anchorScroll, $routeParams, saveAs, countDownloads, CONS, $q ) {

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
    $scope.progress = {}; // 다운로드 진행 상황을 저장하는 객체

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

    // 데이터를 청크 단위로 쪼개서 순차적으로 요청하는 함수
    function fetchDataInChunks(volIdx, lastIdx) {
        var chunkSize = CONS.chunkSize;
        var requestDelay = CONS.requestDelay;
        var totalChunks = Math.ceil(lastIdx / chunkSize);
        
        // 진행상황 초기화
        $scope.progress[volIdx] = {
            current: 0,
            total: totalChunks
        };
        
        var deferred = $q.defer();
        var allData = [];
        var currentChunk = 0;
        
        // 재시도 메커니즘을 위한 카운터
        var retryCount = {};
        var maxRetries = 3;
        
        // 청크 하나를 요청하는 함수
        function fetchChunk() {
            if (currentChunk >= totalChunks) {
                // 모든 청크를 처리했으면 결과 반환
                deferred.resolve(allData);
                return;
            }
            
            var begin = currentChunk * chunkSize + 1;
            var end = Math.min((currentChunk + 1) * chunkSize, lastIdx);
            var downloadUrl = $scope.targetBook.VolUrl + volIdx + "/contents?begin=" + begin + "&end=" + end;
            
            $http.get(downloadUrl, CONS.api.conf)
                .then(function(res) {
                    // 성공적으로 데이터를 받아옴
                    allData = allData.concat(res.data.DATA);
                    $scope.progress[volIdx].current++;
                    currentChunk++;
                    
                    // 다음 청크를 요청하기 전에 지연 시간을 둠
                    setTimeout(fetchChunk, requestDelay);
                })
                .catch(function(error) {
                    console.log("Error fetching chunk:", error);
                    
                    // 재시도 로직
                    if (!retryCount[currentChunk]) {
                        retryCount[currentChunk] = 0;
                    }
                    
                    if (retryCount[currentChunk] < maxRetries) {
                        retryCount[currentChunk]++;
                        console.log("Retrying chunk " + currentChunk + ", attempt " + retryCount[currentChunk]);
                        // 재시도 전에 더 긴 지연 시간을 둠
                        setTimeout(fetchChunk, requestDelay * 2);
                    } else {
                        // 최대 재시도 횟수를 초과하면 실패
                        deferred.reject("Failed to fetch chunk after " + maxRetries + " retries");
                    }
                });
        }
        
        // 첫 번째 청크 요청 시작
        fetchChunk();
        
        return deferred.promise;
    }

    $scope.dnTxt = function(volIdx, volname, lastIdx, dnIdx) {
        if (!confirm("다운로드를 하시겠습니까?\n(1-2분 정도 소요됩니다)")) {
            return;
        }

        $scope.dnIdx[dnIdx] = true;
        var downloadedFileName = ($scope.targetBook.name + " " + volname + "(" + downloadDate() + ")" + ".txt").replace(/\s+/g, "_");

        // 다운로드 시작 메시지
        var statusMessage = "다운로드가 시작되었습니다. 잠시만 기다려주세요...";
        if (lastIdx > 1000) {
            statusMessage += "\n데이터가 많아 다소 시간이 걸릴 수 있습니다.";
        }
        alert(statusMessage);

        // 청크 단위로 데이터 요청 및 처리
        fetchDataInChunks(volIdx, lastIdx)
            .then(function(allData) {
                // 모든 데이터가 수집된 후 텍스트 생성 및 다운로드
                var textContent = defaultheader($scope.targetBook, $scope.eol) + makeTxt(allData, $scope.eol);
                downloadTxt(textContent, downloadedFileName);
                count(volIdx, $scope.counter);
                $scope.dnIdx[dnIdx] = false;
                alert("다운로드가 완료되었습니다!");
            })
            .catch(function(error) {
                console.error("Download failed:", error);
                alert("다운로드 중 오류가 발생했습니다: " + error + "\n다시 시도해주세요.");
                $scope.dnIdx[dnIdx] = false;
            });
    };
});