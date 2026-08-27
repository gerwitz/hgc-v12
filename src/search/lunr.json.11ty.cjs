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
    var pages = data.collections.searchable;

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
        tags: doc.data["topics"],
        content: doc.content
      });
    });

    var idx = builder.build()

    var docMap = {};
    pages.forEach(function (doc, index) {
      var title = doc.data.title || 'Untitled';
      var meta = false;
      switch(doc.data.layout) {
        case 'week':
          title = 'Week ' + doc.fileSlug;
          break;
        case 'writing':
          meta = moment(doc.date).format('MMMM Do, YYYY');
          break;
      }
      docMap[index] = {
        url: doc.url,
        title: title,
        meta: meta
      };
    });

    return JSON.stringify({
      index: idx,
      map: docMap
    });
  }

}

module.exports = LunrIndex;
