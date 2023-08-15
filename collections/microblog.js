// microblog notes + links to writing

module.exports = function(collection) {
  var writing = collection.getFilteredByTag('writing');
  var notes = collection.getFilteredByTag('notes');

  var headlines = writing
    .filter(function(item) {
      return !(item.data.excludeFromFeed);
    })
    .map(function(item) {
      return {
        type: 'post',
        inputPath: item.inputPath,
        fileSlug: item.fileSlug,
        outputPath: item.outputPath,
        url: item.url,
        date: item.date,
        title: item.data.title,
        content: '<a href="'+item.url+'">'+item.data.title+'</a>'
      }
    });

  var full = notes
    .concat(headlines);

  // most recent first
  full.sort(function(a, b) {
      return (b.date - a.date);
    });

  // top 50 only
  return full.slice(0, 50);
};
