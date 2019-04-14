const pluginRss = require("@11ty/eleventy-plugin-rss");

module.exports = function(config) {
  config.addPlugin(pluginRss); // used only for absoluting URLs

  // template filters
  config.addFilter("cssmin", require("./filters/cssmin.js") );
  config.addFilter("date", require("./filters/date.js") );
  config.addFilter("hostname", require("./filters/hostname.js") );
  config.addFilter("limit", require("./filters/limit.js") );
  config.addFilter("parents", require("./filters/parents.js") );

  // 🌲
  config.addShortcode("tree", function(height) {
    var heightAttr = '';
    if (height) {
      heightAttr = 'height="' + height + '" ';
    }
    return '<svg ' + heightAttr + 'viewbox="0 0 128 198" version="1" xmlns="http://www.w3.org/2000/svg"><path d="M112 198v-8c0-4-4-8-8-8H84c-4 0-8-4-8-8v-12h52l-4-12H75v-12h45l-4-12H75v-12h37l-4-12H75V90h29l-4-12H75V66h21l-4-12H75V42h13l-4-12H74V18h2V6c0-4-6-6-12-6S52 2 52 6v12h2v12H44l-4 12h13v12H36l-4 12h21v12H28l-4 12h29v12H20l-4 12h37v12H12l-4 12h45v12H4l-4 12h52v12c0 4-4 8-8 8H24c-4 0-8 4-8 8v8h96" fill="#00852B" fill-rule="evenodd"/></svg>';
  });

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
