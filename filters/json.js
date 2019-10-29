const stringify = require('javascript-stringify').stringify;

module.exports = function(string, limit = 3) {
  return stringify(string, null, "\t", { maxDepth: limit });
}
