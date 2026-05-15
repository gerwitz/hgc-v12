import pluginRss from "@11ty/eleventy-plugin-rss";
import nbspFilter from "eleventy-nbsp-filter";

import collectionsPlugin from "./eleventy/collections.js";
import cssPlugin from "./eleventy/css.js";
import filtersPlugin from "./eleventy/filters.js";
import markdownPlugin from "./eleventy/markdown.js";
import shortcodesPlugin from "./eleventy/shortcodes.js";
import staticAssetsPlugin from "./eleventy/static.js";

const INPUT_DIR = "src";
const MEDIA_PATH_PREFIX = "/media/";
const MEDIA_ORIGIN = process.env.MEDIA_ORIGIN;
const NBSP_MIN_WORDS = 2;
const NBSP_MAX_LENGTH = 12;

export default function configure(eleventyConfig) {
  eleventyConfig.setQuietMode(true);
  eleventyConfig.setDataDeepMerge(true);

  if (MEDIA_ORIGIN) {
    eleventyConfig.setServerOptions({
      middleware: [
        (request, response, next) => {
          if (request.url.startsWith(MEDIA_PATH_PREFIX)) {
            const mediaPath = request.url.slice(MEDIA_PATH_PREFIX.length);
            const mediaUrl = new URL(mediaPath, MEDIA_ORIGIN);

            response.writeHead(302, {
              Location: mediaUrl.toString(),
            });
            response.end();
            return;
          }

          next();
        },
      ],
    });
  }

  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(cssPlugin, { inputDir: INPUT_DIR });
  eleventyConfig.addPlugin(collectionsPlugin);
  eleventyConfig.addPlugin(filtersPlugin, {
    extraFilters: {
      nbsp: nbspFilter(NBSP_MIN_WORDS, NBSP_MAX_LENGTH),
    },
  });
  eleventyConfig.addPlugin(shortcodesPlugin, { inputDir: INPUT_DIR });
  eleventyConfig.addPlugin(markdownPlugin);
  eleventyConfig.addPlugin(staticAssetsPlugin);

  eleventyConfig.addGlobalData("generated", () => {
    return new Date();
  });

  return {
    dir: {
      input: INPUT_DIR,
      output: "_site",
      includes: "/_includes",
      layouts: "/_layouts",
    },
    templateFormats: ["html", "njk", "md", "11ty.js"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    passthroughFileCopy: true,
  };
}
