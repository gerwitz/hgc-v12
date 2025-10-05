import * as shortcodes from "./shortcodes/index.js";

export default function shortcodesPlugin(eleventyConfig, options = {}) {
  const { inputDir = "src" } = options;

  for (const [name, shortcode] of Object.entries(shortcodes)) {
    console.log(`Adding shortcode: ${name}`);
    eleventyConfig.addShortcode(name, shortcode);
  }

  eleventyConfig.addShortcode("tree", (height) => {
    const heightAttr = height ? `height="${height}" ` : "";
    return `${"<svg " + heightAttr}viewbox="0 0 128 198" xmlns="http://www.w3.org/2000/svg"><path d="M112 198v-8c0-4-4-8-8-8H84c-4 0-8-4-8-8v-12h52l-4-12H75v-12h45l-4-12H75v-12h37l-4-12H75V90h29l-4-12H75V66h21l-4-12H75V42h13l-4-12H74V18h2V6c0-4-6-6-12-6S52 2 52 6v12h2v12H44l-4 12h13v12H36l-4 12h21v12H28l-4 12h29v12H20l-4 12h37v12H12l-4 12h45v12H4l-4 12h52v12c0 4-4 8-8 8H24c-4 0-8 4-8 8v8h96" fill="#00852B" fill-rule="evenodd"/></svg>`;
  });

  eleventyConfig.addShortcode("children", (collectionsApi, dirPath) => {
    const glob = `${inputDir}${dirPath}/*`;
    const items = collectionsApi
      .getFilteredByGlob(glob)
      .map((item) => `<li><a href="${item.url}">${item.title}</a></li>`)
      .join("");

    return `<ul>${items}</ul>`;
  });
}
