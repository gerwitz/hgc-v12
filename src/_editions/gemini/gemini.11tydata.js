export default {
  layout: "gemini",
  eleventyExcludeFromCollections: true,
  permalink: (data) =>
  {
    if (data.page.inputPath.endsWith(".gmi"))
    {
      const outputPath = data.page.inputPath.replace(/^.*\/_editions\/gemini\//, "/editions/gemini/");
      // Match the capsule's directory-style URLs without requiring front matter.
      return outputPath.endsWith("/index.gmi")
        ? outputPath
        : outputPath.replace(/\.gmi$/, "/index.gmi");
    }

    return undefined;
  },
  gemini: {
    webOrigin: "https://hans.gerwitz.com",
    collections: ["gemlog", "notes", "about", "lists"],
    routeAliases: {
      "/writing/": "/gemlog/archive/",
      "/posts/": "/gemlog/archive/",
    },
    routes: [
      "/",
      "/gemlog/",
      "/gemlog/archive/",
      "/gemlog/dsn/",
      "/notes/",
      "/about/",
      "/lists/",
    ],
  },
};
