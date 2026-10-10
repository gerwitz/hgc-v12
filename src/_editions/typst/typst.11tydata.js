export default {
  layout: "typst",
  eleventyExcludeFromCollections: true,
  permalink: (data) =>
  {
    if (data.page.inputPath.endsWith(".typ"))
    {
      // Preserve native Typst filenames within the expression's output directory.
      return data.page.inputPath.replace(/^.*\/_editions\/typst\//, "/editions/typst/");
    }

    return undefined;
  },
};
