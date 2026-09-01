import moment from "moment";

const PROJECT_NAME = "Bear Den";

export default {
  tags: ["bearsDevlog"],
  eleventyComputed: {
    // Keep the devlog index at /projects/bears/devlog/ and entries beneath it.
    permalink: (data) => {
      const isIndexPage = data.page.filePathStem.endsWith("/index");

      if (isIndexPage) {
        return "/projects/bears/devlog/";
      }

      return `/projects/bears/devlog/${data.page.fileSlug}/`;
    },
    // Use project-specific breadcrumbs for devlog entries.
    breadcrumbs: (data) => {
      const crumbs = ["projects", "bears", "devlog"];
      const isIndexPage = data.page.filePathStem.endsWith("/index");

      if (!isIndexPage) {
        crumbs.push(data.page.fileSlug);
      }

      return crumbs;
    },
    description: (data) => {
      if (data.description || data.page.filePathStem.endsWith("/index") || !data.page.date) {
        return data.description;
      }

      return `${PROJECT_NAME} devlog, ${moment(data.page.date).format("DD MMM YYYY")}`;
    },
  },
};
