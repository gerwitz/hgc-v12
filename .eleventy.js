import pluginRss from "@11ty/eleventy-plugin-rss";
import nbspFilter from "eleventy-nbsp-filter";

import * as collections from "./collections/index.js";
import * as filters from "./filters/index.js";
import * as shortcodes from "./shortcodes/index.js";

export default function(eleventyConfig) {
  var inputPath = "src";

  eleventyConfig.setQuietMode(true);

  eleventyConfig.addWatchTarget("./src/css/");

  eleventyConfig.setDataDeepMerge(true);

  // plugins
  eleventyConfig.addPlugin(pluginRss); // used only for absoluting URLs

  // custom collections
  for (const [name, collection] of Object.entries(collections)) {
    eleventyConfig.addCollection(name, collection);
  }

  // template filters
  for (const [name, filter] of Object.entries(filters)) {
    eleventyConfig.addCollection(name, filter);
  }

  const numberOfWordsToJoin = 2;
  const maxLength = 12;
  eleventyConfig.addFilter('nbsp', nbspFilter(numberOfWordsToJoin, maxLength));

  // shortcodes
  for (const [name, filter] of Object.entries(shortcodes)) {
    eleventyConfig.addCollection(name, filter);
  }

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
  let markdownItFootnote = require("markdown-it-footnote-here");
  let markdownItAttribution = require("markdown-it-attribution");
  let markdownItImplicitFigures = require('markdown-it-implicit-figures');
  let markdownItAnchor = require("markdown-it-anchor");
  let markdownItDeflist = require('markdown-it-deflist');
  let markdownItLinkAttributes = require('markdown-it-link-attributes');
  let options = {
    html: true,
    linkify: true,
    typographer: true,
    quotes: '“”‘’'
  };
  let markdownLib = markdownIt(options)
    .use(markdownItFootnote)
    .use(markdownItAttribution, {
      classNameContainer: 'quotation',
      classNameAttribution: '',
      marker: '--',
      removeMarker: true
    })
    .use(markdownItImplicitFigures, {
      dataType: true,
      figcaption: true
    })
    .use(markdownItAnchor)
    .use(markdownItDeflist)
    .use(markdownItLinkAttributes, [
      {
        matcher(href) {
          return href.match(/^https?:\/\//);
        },
        attrs: {
          class: "external-link",
        },
      },
      {
        matcher(href) {
          return href.match(/^[./](.*)\/$/);
        },
        attrs: {
          class: "index-link",
        },
      },
    ])
    .disable(["lheading"]);
  markdownLib.renderer.rules.footnote_ref = function (tokens, idx, options, env, slf) {
    var id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);
    return '<label for="fn:'+id+'" id="fnref:' + id + '"><a href="#fn:' + id + '" rel="footnote" role="doc-noteref" aria-describedby="fn:' + id + '" class="sidenote-ref">'+id+'</a></label>';
  }
  markdownLib.renderer.rules.footnote_block_open = () => ('<!-- footnote open -->');
  markdownLib.renderer.rules.footnote_block_close = () => ('<!-- footnote close -->');
  markdownLib.renderer.rules.footnote_open = function (tokens, idx, options, env, slf) {
    var id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);
    return '<aside id="fn:'+id+'" class="sidenote" form-associated="true"><span class="sidenote-ref">'+id+'</span>';
  }; // footnote token will wrap content in a <p>
  markdownLib.renderer.rules.footnote_close = () => ('</aside>');
  markdownLib.linkify.set({ fuzzyLink: false }); // don't turn simple domains into links
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
  // eleventyConfig.addPassthroughCopy({"src/_meta/favicon": "/favicon"});
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
