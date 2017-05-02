angular.module("hanzitn", ["ngSanitize"])

.constant("api", {
		rooturl: "https://kmapibox.mediclassics.org" + "/api/tn/",
		conf : {
			headers : {
			},
			data: ""
			// 이게 없으면 Content-Type이 설정되지 않음 // https://stackoverflow.com/questions/24895290/content-type-header-not-being-set-with-angular-http
		}
	}
)

.factory('Board', function(){

	var results = []

	function addRst( newrst ){
		results.push (newrst)
	}

	function getRst(){
		return results
	}

	function getLastRst(){
		return results[results.length - 1]
	}

  	return {
  		"addRst": addRst,
  		"getRst": getRst,
  		"getLastRst": getLastRst
	};
})


.controller("duplicationsMergeCtrl", function ($scope, $http, api, Board) {
	$scope.mergeDuplications = function(){
		$scope.dupProcessing = true;
		var reqUrl = api.rooturl + 'duplications' //'?text=' + encodeURIComponent($scope.rawTextdup)
		// console.log(reqUrl)
		$http.post( reqUrl, {text: $scope.rawTextdup}, api.conf ).then(function(res){
			$scope.mergedTextdup = res.data.output;
			Board.addRst( $scope.mergedTextdup )
			$scope.dupProcessing = false;
		})
	}


})

.controller("variantsMergeCtrl", function ($scope, $http, api, Board) {
	$scope.tntype = $scope.tntype || "general"
	$scope.mergeVariants = function(){
		console.log($scope.tntype )
		$scope.valProcessing = true;
		var reqUrl = ($scope.tntype==='general')? api.rooturl + 'variants' : api.rooturl + 'variants?extention=true'  // '?text=' + encodeURIComponent($scope.rawTextvar)
		// console.log(reqUrl)
		$http.post( reqUrl, {text: $scope.rawTextvar}, api.conf ).then(function(res){
			$scope.mergedTextvar = res.data.output;
			Board.addRst( $scope.mergedTextvar )
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
		$scope.rawText = Board.getLastRst()
	}

})

.controller("footerCtrl", function($scope, api){
	$scope.dictRefAddress = [
		{"name": "duplications", 		"url": api.rooturl + "/dict/duplications" + "?type=tsv"},
		{"name": "variants", 			"url": api.rooturl + "/dict/variants" + "?type=tsv"},
		{"name": "variantsExtention", 	"url": api.rooturl + "/dict/variantsExtention" + "?type=tsv"}
	]

	$scope.externalRefs = [
		{"name": "ctext",				"url": "http://ctext.org/dictionary.pl?if=en"}
	]
})
