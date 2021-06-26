const pluginRss = require("@11ty/eleventy-plugin-rss");

const nbspFilter = require('eleventy-nbsp-filter');

module.exports = function(eleventyConfig) {
  var inputPath = "src";

  eleventyConfig.setQuietMode(true);

  eleventyConfig.addWatchTarget("./src/css/");

  eleventyConfig.setDataDeepMerge(true);

  // custom collections
  eleventyConfig.addCollection("weeks", require("./collections/weeks.js") );
  eleventyConfig.addCollection("posts", require("./collections/posts.js") );
  eleventyConfig.addCollection("microblog", require("./collections/microblog.js") );

  eleventyConfig.addCollection("weeklyNotes", require("./collections/weeklyNotes.js") );
  eleventyConfig.addCollection("weeklyWriting", require("./collections/weeklyWriting.js") );
  eleventyConfig.addCollection("weeklyEvents", require("./collections/weeklyEvents.js") );

  eleventyConfig.addCollection("epitaphs", require("./collections/epitaphs.js") );

  // plugins
  eleventyConfig.addPlugin(pluginRss); // used only for absoluting URLs

  // template filters
  eleventyConfig.addFilter("cssmin", require("./filters/cssmin.js") );
  eleventyConfig.addFilter("date", require("./filters/date.js") );
  eleventyConfig.addFilter("hostname", require("./filters/hostname.js") );
  eleventyConfig.addFilter("json", require("./filters/json.js") );
  eleventyConfig.addFilter("limit", require("./filters/limit.js") );
  eleventyConfig.addFilter("moonforweek", require("./filters/moonforweek.js") );
  eleventyConfig.addFilter("parents", require("./filters/parents.js") );
  eleventyConfig.addFilter("weeklink", require("./filters/weeklink.js") );
  eleventyConfig.addFilter("weeknum", require("./filters/weeknum.js") );
  eleventyConfig.addFilter("weekstart", require("./filters/weekstart.js") );

  const numberOfWordsToJoin = 2;
  const maxLength = 12;
  eleventyConfig.addFilter('nbsp', nbspFilter(numberOfWordsToJoin, maxLength));

  // 🌲
  eleventyConfig.addShortcode("tree", function(height) {
    var heightAttr = '';
    if (height) {
      heightAttr = 'height="' + height + '" ';
    }
    return '<svg ' + heightAttr + 'viewbox="0 0 128 198" xmlns="http://www.w3.org/2000/svg"><path d="M112 198v-8c0-4-4-8-8-8H84c-4 0-8-4-8-8v-12h52l-4-12H75v-12h45l-4-12H75v-12h37l-4-12H75V90h29l-4-12H75V66h21l-4-12H75V42h13l-4-12H74V18h2V6c0-4-6-6-12-6S52 2 52 6v12h2v12H44l-4 12h13v12H36l-4 12h21v12H28l-4 12h29v12H20l-4 12h37v12H12l-4 12h45v12H4l-4 12h52v12c0 4-4 8-8 8H24c-4 0-8 4-8 8v8h96" fill="#00852B" fill-rule="evenodd"/></svg>';
  });

  eleventyConfig.addShortcode("children", function(collections, path) {
    let glob = inputPath + path + '/*';
    let list = collections
      .getFilteredByGlob(glob)
      .map(item => '<li><a href="'+item.url+'">'+item.title+'</li>');
    return '<ul>'+list+'</ul>';
  });

  // manually configure markdown-it
  let markdownIt = require("markdown-it");
  let markdownItSidenote = require("markdown-it-sidenote");
  let markdownItAttribution = require("markdown-it-attribution");
  let markdownItImplicitFigures = require('markdown-it-implicit-figures');
  let options = {
    html: true,
    linkify: true,
    typographer: true,
    quotes: '“”‘’'
  };
  let markdownLib = markdownIt(options)
    .use(markdownItSidenote)
    .use(markdownItAttribution)
    .use(markdownItImplicitFigures, {
      dataType: true,
      figcaption: true
    });
  eleventyConfig.setLibrary("md", markdownLib);

  eleventyConfig.addPassthroughCopy("src/**/*.gif");
  eleventyConfig.addPassthroughCopy("src/**/*.jpg");
  eleventyConfig.addPassthroughCopy("src/**/*.jpeg");
  eleventyConfig.addPassthroughCopy("src/**/*.png");
  eleventyConfig.addPassthroughCopy("src/**/*.svg");
  eleventyConfig.addPassthroughCopy("src/**/*.pdf");
  eleventyConfig.addPassthroughCopy("src/projects/**/*.js");
  eleventyConfig.addPassthroughCopy("src/projects/**/*.pde");
  eleventyConfig.addPassthroughCopy("src/projects/**/*.json");
  eleventyConfig.addPassthroughCopy({"src/_meta": "/"});
  eleventyConfig.addPassthroughCopy({"src/_meta/favicon": "/favicon"});
  eleventyConfig.addPassthroughCopy("src/css/fonts/*");

  return {
    dir: {
      input: inputPath,
      output: "_site",
      includes: "/_includes",
      layouts: "/_layouts"
    },
    templateFormats : [
      "html",
      "njk",
      "md",
      "11ty.js"
    ],

    // always Nunjuk so we can use dynamic permalinks in the template
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",

    passthroughFileCopy: true // unhandled types above will be simply copied
  };

};
