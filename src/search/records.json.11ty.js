export default class SearchRecords {
  data()
  {
    return {
      eleventyExcludeFromCollections: true,
      permalink: false,
    };
  }

  render(data)
  {
    return JSON.stringify(data.collections.searchable.map((item) => {
      return {
        contentDate: item.data.contentDate || null,
        topics: item.data.topics || [],
        url: item.url,
      };
    }));
  }
}
