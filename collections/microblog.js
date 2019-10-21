// microblog notes + links to writing

module.exports = function(collection) {
  var writing = collection.getFilteredByTag('writing');
  var notes = collection.getFilteredByTag('notes');

  var headlines = writing
    .filter(function(item) {
      return !(item.published == false);
    })
    .map(function(item) {
      return {
        inputPath: item.inputPath,
        fileSlug: item.fileSlug,
        outputPath: item.outputPath,
        url: item.url,
        date: item.date,
        templateContent: '<a href="'+item.url+'">'+item.data.title+'</a>'
        // no data
      }
    });

  var full = notes
    .concat(headlines);

  full.sort(function(a, b) {
      return (a.date - b.date);
    });

  return full;
};
