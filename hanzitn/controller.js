angular.module("hanzitn", ["ngSanitize"])

.constant("api", {
		rooturl: "https://kmapibox.mediclassics.kr" + "/api/",
		conf : {
			headers : {
			},
			data: ""
			// 이게 없으면 Content-Type이 설정되지 않음 // https://stackoverflow.com/questions/24895290/content-type-header-not-being-set-with-angular-http
		}
	}
)

.factory('Board', function(){

	var lastest = []

	function addRst( newrst ){
		lastest = newrst
	}

	function getLastRst(){
		return lastest
	}

  	return {
  		"addRst": addRst,
  		"getLastRst": getLastRst
	};
})

.factory('Tools', function($http, api){

	function diff(text1, text2){
		var reqUrl = api.rooturl + 'diff'
		return $http.post( reqUrl, {"text1": text1, "text2": text2}, api.conf )
	}

	return {
		"diff": diff
	}


})

.controller("duplicationsMergeCtrl", function ($scope, $http, api, Board) {

	$scope.rawTextdup = "[예시]\n不(U+F967) → 不(U+4E0D)\n更(U+F901) → 更(U+66F4)\n里(U+F9E9) → 里(U+91CC)\n六(U+F9D1) → 六(U+516D)"

	$scope.mergeDuplications = function(){
		$scope.dupProcessing = true;
		var reqUrl = api.rooturl + 'tn/' + 'duplications' //'?text=' + encodeURIComponent($scope.rawTextdup)
		// console.log(reqUrl)
		$http.post( reqUrl, {text: $scope.rawTextdup}, api.conf ).then(function(res){
			$scope.mergedTextdup = res.data.output;
			Board.addRst( [$scope.rawTextdup, $scope.mergedTextdup] )
			$scope.dupProcessing = false;
		})
	}

})

.controller("variantsMergeCtrl", function ($scope, $http, api, Board) {

	$scope.rawTextvar = "[예시]\n尚(U+5C1A) → 尙(U+5C19)\n為(U+70BA) → 爲(U+7232)\n垒(U+5792) → 壘(U+58D8)\n胆(U+80C6) → 膽(U+81BD)"

	$scope.tntype = $scope.tntype || "general"
	$scope.mergeVariants = function(){
		console.log($scope.tntype )
		$scope.valProcessing = true;
		var reqUrl = ($scope.tntype==='general')? api.rooturl + 'tn/' + 'variants' : api.rooturl + 'tn/' + 'variants?extention=true'  // '?text=' + encodeURIComponent($scope.rawTextvar)
		// console.log(reqUrl)
		$http.post( reqUrl, {text: $scope.rawTextvar}, api.conf ).then(function(res){
			$scope.mergedTextvar = res.data.output;
			Board.addRst( [$scope.rawTextvar, $scope.mergedTextvar] )
			$scope.valProcessing = false;
		})
	}

})

.controller("replaceCtrl", function ($scope, Board) {

	$scope.bf = "\\s"
	$scope.af = ""
	$scope.replaceAll = function(){
		var rgxBf = new RegExp($scope.bf, "gi")
		// var rgxAf = new RegExp($scope.bf, "gi")
		var rgxAf = $scope.af
		$scope.mergedText = $scope.rawText.replace(rgxBf, rgxAf)
	}

	$scope.clone = function(){
		$scope.rawText = Board.getLastRst()[1]
	}

})

.controller("diffCtrl", function ($scope, Board, Tools) {

	$scope.diff = function(){
		$scope.valProcessing = true;

		var texts = Board.getLastRst()
		Tools.diff( texts[0], texts[1] ).then(function(res){

			$scope.diffrst = res.data.output.html
			$scope.valProcessing = false;
		})
	}

	$scope.reset = function(){

		$scope.diffrst = ""

	}

})


.controller("footerCtrl", function($scope, api){
	$scope.dictRefAddress = [
		{"name": "duplications", 		"url": api.rooturl + "tn/dict/duplications" + "?type=tsv"},
		{"name": "variants", 			"url": api.rooturl + "tn/dict/customvariants" + "?type=tsv"},
		{"name": "variantsExtention", 			"url": api.rooturl + "tn/dict/customvariantsExtention" + "?type=tsv"},
		{"name": "variants group", 			"url": api.rooturl + "tn/dict/variantsgroup" + "?type=tsv"},
		{"name": "variantsExtention group", 	"url": api.rooturl + "tn/dict/variantsExtention" + "?type=tsv"}
	]

	$scope.externalRefs = [
		{"name": "Unicode Character Code Charts",				"url": "http://www.unicode.org/charts/"},
		{"name": "유니코드한자검색시스템",		  "url": "http://www.kostma.net/segment/segmentList.aspx"},
		{"name": "유니코드한자검색기",		  "url": "http://db.koreanstudies.re.kr/"},
		{"name": "Dictionary|Ctext",				"url": "http://ctext.org/dictionary.pl?if=en"},
		{"name": "漢典",				"url": "http://www.zdic.net/"},
		{"name": "이체자정보검색|한국고전번역원",		  "url": "http://db.itkc.or.kr/DCH/index.jsp"},
		{"name": "고문서서체용례사전|한국학중앙연구원",		  "url": "http://www.kostma.net/segment/segmentList.aspx"},
		{"name": "漢典書法",				"url": "http://sf.zdic.net/"},
		{"name": "(敎育部)異體字字典",	"url": "http://dict2.variants.moe.edu.tw/variants/rbt/home.do"},
		{"name": "國際電腦漢字及異體字知識庫",	"url": "http://chardb.iis.sinica.edu.tw/"},
	]

	$scope.externalTools = [
		{"name": "Open Chinese Convert", 	"url": "https://github.com/BYVoid/OpenCC"},
		{"name": "Make Me a Hanzi", 	"url": "https://github.com/skishore/makemeahanzi"},
		{"name": "HanziJS", 	"url": "https://github.com/nieldlr/Hanzi"},
		{"name": "Diff", 				"url": "https://neil.fraser.name/software/diff_match_patch/svn/trunk/demos/demo_diff.html"}
	]
})
