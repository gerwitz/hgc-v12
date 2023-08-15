const NunjucksLib = require("nunjucks");

module.exports = function(path, crumbPath) {
  var link = '';
  if (!crumbPath) {crumbPath=""}
  var crumbs = Array.from(crumbPath);

  if (crumbs[0] == path) {     // we are least UNDER this page
    if (crumbs.length == 1) {  // actually, we're ON this page
      link = '<span class="internal active">' + path + '</span>';
    }
    else {
      link = '<a class="internal active" href="/' + path + '/">' + path + '</a>';
    }
  }
  else {
    link = '<a class="internal" href="/' + path + '/">' + path + '</a>';
  }

  return new NunjucksLib.runtime.SafeString(link);
}
