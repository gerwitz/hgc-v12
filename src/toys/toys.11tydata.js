const getToyName = (data) => {
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

      return ["toys", getToyName(data)];
    },
    toyType: (data) => data.type,
    toyScript: (data) => {
      const toyName = getToyName(data);
      return `/toys/${toyName}/${toyName}.js`;
    },
    toyEmbed: (data) => {
      const toyName = getToyName(data);
      const script = `/toys/${toyName}/${toyName}.js`;
      return `/toys/embed/?type=${encodeURIComponent(data.type)}&script=${encodeURIComponent(script)}`;
    },
  },
};
