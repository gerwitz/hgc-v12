import moment from "moment";

export default {
  eleventyComputed: {
    // Give each note a stable title without requiring front matter.
    title: (data) => {
      if (data.layout === "index" || !data.page?.date) {
        return data.title;
      }

      return `Note from ${moment(data.page.date).format("MMMM Do, YYYY")}`;
    },
    // Use the template date for the breadcrumb.
    breadcrumbs: data => {
      const crumbs = ["notes"];
      if (data.layout !== 'index' && data.page && data.page.date) {
        crumbs.push(data.page.date.toISOString().slice(0, 10));
      }
      return crumbs;
    }
  }
};
