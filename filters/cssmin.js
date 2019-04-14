const cleanCSS = require("clean-css");

module.exports = function(code) {
  return new cleanCSS({}).minify(code).styles;
};
