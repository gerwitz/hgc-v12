import * as collections from "./collections/index.js";

export default function collectionsPlugin(eleventyConfig) {
  for (const [name, collection] of Object.entries(collections)) {
    console.log(`Adding collection: ${name}`);
    eleventyConfig.addCollection(name, collection);
  }
}
