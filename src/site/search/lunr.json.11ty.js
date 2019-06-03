var lunr = require('lunr');
var moment = require("moment");

class LunrIndex {

  data() {
    return {
      permalink: "/search/lunr.json",
      eleventyExcludeFromCollections: true
    };
  }

  render(data) {
    var pages = data.collections.content;

    var builder = new lunr.Builder
    builder.pipeline.add(
      lunr.trimmer,
      lunr.stopWordFilter,
      lunr.stemmer
    )
    builder.searchPipeline.add(
      lunr.stemmer
    )

    builder.ref('ref');
    builder.field('title');
    builder.field('tags');
    builder.field('content');

    pages.forEach(function (doc, index) {
      builder.add({
        ref: index,
        title: doc.data.title,
        tags: doc.data["content-tags"],
        content: doc.templateContent
      });
    });

    var idx = builder.build()

    var docMap = {};
    pages.forEach(function (doc, index) {
      docMap[index] = {
        url: doc.url,
        title: doc.data.title || "Note from " + moment(doc.date).format('MMMM Do, YYYY')
      };
    });

    return JSON.stringify({
      index: idx,
      map: docMap
    });
  }

}

module.exports = LunrIndex;
