// Hexmap development log entries

export const hexmapDevlog = collection => {
  return collection.getAll().filter(item => {
    return item.inputPath && item.inputPath.includes("/src/projects/hexmap/devlog/") && item.data.page.fileSlug !== "index";
  });
};
