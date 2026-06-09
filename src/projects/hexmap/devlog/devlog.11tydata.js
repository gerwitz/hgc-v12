export default {
  eleventyComputed: {
    // Keep the devlog index at /projects/hexmap/devlog/ and entries beneath it.
    permalink: data => {
      if (data.page.fileSlug === "index") {
        return "/projects/hexmap/devlog/";
      }

      return `/projects/hexmap/devlog/${data.page.fileSlug}/`;
    },
    // Use project-specific breadcrumbs for devlog entries.
    breadcrumbs: data => {
      const crumbs = ["projects", "hexmap", "devlog"];

      if (data.page.fileSlug !== "index") {
        crumbs.push(data.page.fileSlug);
      }

      return crumbs;
    }
  }
};
