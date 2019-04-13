const URL = require('url');

module.exports = function(url) {
  var parsedUrl = URL.parse(url);
  return parsedUrl.hostname;
}
