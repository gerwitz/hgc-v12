module.exports = {
  eleventyComputed: {
    crumbtrail: data => {
      if (data.breadcrumbs) {
        return Array.from(data.breadcrumbs).concat(data.page.fileSlug);
      }
      else if (data.page.url) {
        return data.page.url.split('/').filter(path => path);
      }
      else {
        // FIXME: this is getting called on pages that also seem to be processed correctly. Are there phantom entities?
        // console.log(data.layout + ' ' + data.page.fileSlug);
        return ['oops'];
      };
    }
  }
};
