import * as filters from "./filters/index.js";

export default function filtersPlugin(eleventyConfig, options = {}) {
  for (const [name, filter] of Object.entries(filters)) {
    console.log(`Adding filter: ${name}`);
    eleventyConfig.addFilter(name, filter);
  }

  if (options.extraFilters) {
    for (const [name, filter] of Object.entries(options.extraFilters)) {
      console.log(`Adding filter: ${name}`);
      eleventyConfig.addFilter(name, filter);
    }
  }
}
