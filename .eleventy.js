module.exports = function(config) {

  const CleanCSS = require("clean-css");
  module.exports = function(eleventyConfig) {
    eleventyConfig.addFilter("cssmin", function(code) {
      return new CleanCSS({}).minify(code).styles;
    });
  };

  // Add a date formatter filter to Nunjucks
  config.addFilter("dateFormat", require("./filters/dates.js") );
  config.addFilter("timestamp", require("./filters/timestamp.js") );

  // manually configure markdown-it
  let markdownIt = require("markdown-it");
  let markdownItFootnote = require("markdown-it-footnote");
  let options = {
    html: true,
    typographer: true,
    quotes: '“”‘’'
  };
  let markdownLib = markdownIt(options).use(markdownItFootnote);    
  config.setLibrary("md", markdownLib);

  return {
    dir: {
      input: "src/site",
      output: "dist",
      includes: "_includes",
      layouts: "_layouts"
    },
    templateFormats : [
      "html",
      "njk",
      "md",
      "gif", "jpg", "jpeg", "png"
    ],

    // always Nunjuk so we can use dynamic permalinks in the template
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",

    passthroughFileCopy: true // unhandled types above will be simply copied
  };

};
