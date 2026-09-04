import { getPreviewIconName } from "../../eleventy/shortcodes/previews.js";

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
    const searchableMarkdown = data.collections.searchable
      .filter((item) => item.inputPath.endsWith(".md"))
      .map((item) => {
        if (!item.data.tags?.includes("weeknotes"))
        {
          return item;
        }

        return {
          ...item,
          data: {
            ...item.data,
            searchBodyHtml: item.content,
            title: `Week ${item.fileSlug}`,
          },
          url: `/weeks/${item.fileSlug}/`,
        };
      });
    const metadataOnlyPages = data.collections.all.filter((item) => {
      return !item.inputPath.endsWith(".md")
        && item.url
        && (item.data.title || item.data.description || item.data.subtitle);
    });
    const itemsByUrl = new Map(
      [...searchableMarkdown, ...metadataOnlyPages].map((item) => [item.url, item]),
    );

    return JSON.stringify(Array.from(itemsByUrl.values()).map((item) => {
      return {
        categories: item.data.categories || [],
        contentDate: item.data.contentDate || null,
        description: item.data.description || item.data.subtitle || null,
        previewIconName: getPreviewIconName(item),
        searchBodyHtml: item.data.searchBodyHtml || null,
        title: item.data.title || null,
        topics: item.data.topics || [],
        url: item.url,
        wordCount: item.data.wordCount || null,
      };
    }));
  }
}
