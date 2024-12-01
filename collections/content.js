// searchable things

export const content = (collection) => {
  return collection.getFilteredByTags(
    "about",
    "history",
    "lists",
    "notes",
    "projects",
    "site",
    "weeks",
    "writing");
};
