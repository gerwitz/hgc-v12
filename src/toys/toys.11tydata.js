const getToySlug = (data) => {
  return data.page.filePathStem.split("/").at(-2);
};

export default {
  layout: "toy",
  tags: ["toys"],
  eleventyComputed: {
    breadcrumbs: (data) => {
      if (data.layout === "index") {
        return ["toys"];
      }

      return ["toys", getToySlug(data)];
    },
    toySlug: (data) => getToySlug(data),
    toyType: (data) => data.type,
    toyScript: (data) => {
      const toyName = getToySlug(data);
      return `/toys/${toyName}/${toyName}.js`;
    },
    toyEmbed: (data) => {
      const toyName = getToySlug(data);
      const script = `/toys/${toyName}/${toyName}.js`;
      return `/toys/embed/?type=${encodeURIComponent(data.type)}&script=${encodeURIComponent(script)}`;
    },
  },
};
