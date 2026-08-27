// Content pages eligible for topic listings.
export const contentTags = [
  "about",
  "history",
  "lists",
  "notes",
  "projects",
  "site",
  "weeks",
  "writing",
];

export const isContent = (item) => {
  return item.data.tags?.some((tag) => contentTags.includes(tag));
};

export const content = (collection) => {
  return collection.getAll().filter(isContent);
};
