module.exports = function(path, currentPath) {

  if (currentPath.startsWith(path)) { // we're under this directory


  }

  var parts = relativeUrl.split('/').filter(path => path); // strips empties
  if path



  var paths = relativeUrl.split('/').filter(path => path);

  return paths.slice(0, -1);
}
