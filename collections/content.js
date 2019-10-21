// searchable things

module.exports = function(collection) {
  return collection.getFilteredByGlob([
    // "**/*.md",
    "src/about/**/*",
    "src/etc/**/*",
    "src/lists/**/*",
    "src/notes/**/*",
    "src/projects/**/*",
    "src/site/**/*",
    "src/weeks/**/*",
    "src/writing/**/*"
  ]);
};
