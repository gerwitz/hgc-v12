import { getContentMetadata } from "../../eleventy/content-records.js";

export default class SearchRecords
{
  data()
  {
    return {
      eleventyExcludeFromCollections: true,
      permalink: false,
    };
  }

  render(data)
  {
    return JSON.stringify(getContentMetadata(data.collections));
  }
}
