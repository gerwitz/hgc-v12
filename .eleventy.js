const pluginRss = require("@11ty/eleventy-plugin-rss");

module.exports = function(config) {
  config.addPlugin(pluginRss); // used only for absoluting URLs

  const CleanCSS = require("clean-css");
  module.exports = function(config) {
    config.addFilter("cssmin", function(code) {
      return new CleanCSS({}).minify(code).styles;
    });
  };

  // template filters
  config.addFilter("date", require("./filters/date.js") );
  config.addFilter("hostname", require("./filters/hostname.js") );
  config.addFilter("limit", require("./filters/limit.js") );

  // manually configure markdown-it
  let markdownIt = require("markdown-it");
  let markdownItFootnote = require("markdown-it-footnote");
  let options = {
    html: true,
    linkify: true,
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

    // I'd like to do this, but the default behavior is weird (see https://github.com/11ty/eleventy/issues/214 )
    // eleventyConfig.addPassthroughCopy("_meta", "/");
    // so, for now, see the gulp "meta" task
  };

};
