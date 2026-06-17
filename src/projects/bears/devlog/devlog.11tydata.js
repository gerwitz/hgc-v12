export default {
  eleventyComputed: {
    // Use a local tag collection for devlog entries while keeping index page out.
    tags: (data) => {
      const inheritedTags = Array.isArray(data.tags) ? data.tags : [];

      if (data.page.fileSlug === "index") {
        return inheritedTags;
      }

      return [...inheritedTags, "bearsDevlog"];
    },
    // Keep the devlog index at /projects/bears/devlog/ and entries beneath it.
    permalink: (data) => {
      if (data.page.fileSlug === "index") {
        return "/projects/bears/devlog/";
      }

      return `/projects/bears/devlog/${data.page.fileSlug}/`;
    },
    // Use project-specific breadcrumbs for devlog entries.
    breadcrumbs: (data) => {
      const crumbs = ["projects", "bears", "devlog"];

      if (data.page.fileSlug !== "index") {
        crumbs.push(data.page.fileSlug);
      }

      return crumbs;
    },
  },
};
