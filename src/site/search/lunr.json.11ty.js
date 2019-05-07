var lunr = require('lunr');

class LunrIndex {

  data() {
    return {
      permalink: "/search/lunr.json",
      eleventyExcludeFromCollections: true
    };
  }

  oldrender(data) {
    var pages = data.collections.writing.map(function(page) {
      return {
        url: page.url,
        title: page.data.title,
        date: page.date,
        content: page.templateContent
      };
    });
    return JSON.stringify(pages);
  }

  render(data) {
    var pages = data.collections.writing;

    var idx = lunr(function () {
      this.ref('ref');
      this.field('title');
      this.field('content');

      pages.forEach(function (page, index) {
        this.add(
          {
            ref: index,
            title: page.title,
            content: page.templateContent
          }
        )
      }, this);
    });

    var docMap = {};
    pages.forEach(function (page, index) {
      docMap[index] = {
        url: page.url,
        title: page.data.title
      };
    });

    return JSON.stringify({
      index: idx,
      map: docMap
    });
  }

}

module.exports = LunrIndex;
