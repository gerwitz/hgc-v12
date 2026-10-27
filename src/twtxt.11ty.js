import { createTwtxtFeeds } from "../eleventy/twtxt.js";

export default class Twtxt
{
  data()
  {
    return {
      layout: false,
      eleventyExcludeFromCollections: true,
      eleventyImport: {
        collections: ["notes"],
      },
      pagination: {
        data: "collections.notes",
        size: 1,
        alias: "feed",
        before: (notes, data) => createTwtxtFeeds(notes, data.generated),
      },
      permalink: (data) => data.feed.path,
    };
  }

  render(data)
  {
    return data.feed.content;
  }
}
