// Bears development log entries

export const bearsDevlog = collection => {
  return collection.getAll().filter(item => {
    return item.inputPath && item.inputPath.includes("/src/projects/bears/devlog/") && item.data.page.fileSlug !== "index";
  });
};
