export default {
  eleventyComputed: {
    // Use a local tag collection for devlog entries while keeping index page out.
    tags: (data) => {
      const inheritedTags = Array.isArray(data.tags) ? data.tags : [];
      const isIndexPage = data.page.filePathStem.endsWith("/index");

      if (isIndexPage) {
        return inheritedTags;
      }

      return [...inheritedTags, "hexmapDevlog"];
    },
    // Keep the devlog index at /projects/hexmap/devlog/ and entries beneath it.
    permalink: (data) => {
      const isIndexPage = data.page.filePathStem.endsWith("/index");

      if (isIndexPage) {
        return "/projects/hexmap/devlog/";
      }

      return `/projects/hexmap/devlog/${data.page.fileSlug}/`;
    },
    // Use project-specific breadcrumbs for devlog entries.
    breadcrumbs: (data) => {
      const crumbs = ["projects", "hexmap", "devlog"];
      const isIndexPage = data.page.filePathStem.endsWith("/index");

      if (!isIndexPage) {
        crumbs.push(data.page.fileSlug);
      }

      return crumbs;
    },
  },
};
