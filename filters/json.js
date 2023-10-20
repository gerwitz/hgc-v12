// const stringify = require('javascript-stringify').stringify;

module.exports = function(string) {
  return JSON.stringify(string, null, "\t");
}
