export default {
  eleventyComputed: {
    // Keep the devlog index at /projects/bears/devlog/ and entries beneath it.
    permalink: data => {
      if (data.page.fileSlug === "index") {
        return "/projects/bears/devlog/";
      }

      return `/projects/bears/devlog/${data.page.fileSlug}/`;
    },
    // Use project-specific breadcrumbs for devlog entries.
    breadcrumbs: data => {
      const crumbs = ["projects", "bears", "devlog"];

      if (data.page.fileSlug !== "index") {
        crumbs.push(data.page.fileSlug);
      }

      return crumbs;
    }
  }
};
