// all posts

export const posts = (collection) => {
  return collection.getFilteredByTags(
    "notes",
    "writing");
};
