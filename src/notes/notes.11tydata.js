export default {
  eleventyComputed: {
    // use template date for breadcrumb
    breadcrumbs: data => {
      const crumbs = ["notes"];
      if (data.layout !== 'index' && data.page && data.page.date) {
        crumbs.push(data.page.date.toISOString().slice(0, 10));
      }
      return crumbs;
    }
  }
};
