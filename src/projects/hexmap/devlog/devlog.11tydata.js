export default {
  eleventyComputed: {
    // Use a local tag collection for devlog entries while keeping index page out.
    tags: (data) => {
      const inheritedTags = Array.isArray(data.tags) ? data.tags : [];

      if (data.page.fileSlug === "index") {
        return inheritedTags;
      }

      return [...inheritedTags, "hexmapDevlog"];
    },
    // Keep the devlog index at /projects/hexmap/devlog/ and entries beneath it.
    permalink: (data) => {
      if (data.page.fileSlug === "index") {
        return "/projects/hexmap/devlog/";
      }

      return `/projects/hexmap/devlog/${data.page.fileSlug}/`;
    },
    // Use project-specific breadcrumbs for devlog entries.
    breadcrumbs: (data) => {
      const crumbs = ["projects", "hexmap", "devlog"];

      if (data.page.fileSlug !== "index") {
        crumbs.push(data.page.fileSlug);
      }

      return crumbs;
    },
  },
};
