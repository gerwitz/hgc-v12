// all posts

module.exports = function(collection) {
  return collection.getFilteredByTags(
    "notes",
    "writing");
};
