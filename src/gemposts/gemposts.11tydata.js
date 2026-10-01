export default {
  layout: false,
  permalink: false,
  tags: ["gemposts"],
  excludeFromFeed: true,
  eleventyComputed: {
    // Match other dated content: drafts must not enter publication collections.
    eleventyExcludeFromCollections: (data) => data.draft === true,
  },
};
