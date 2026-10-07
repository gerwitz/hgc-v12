import { getContentFeedItems } from "../../eleventy/content-feed.js";

export default {
  eleventyComputed: {
    contentFeed: (data) => getContentFeedItems(data.collections, data.gitDates, data.generated),
  },
};
