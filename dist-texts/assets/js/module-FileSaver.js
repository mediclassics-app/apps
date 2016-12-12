angular.module('FileSaver', []).factory('saveAs', ['$window', function($window) {
  return $window.saveAs; // assumes underscore has already been loaded on the page
}]);
