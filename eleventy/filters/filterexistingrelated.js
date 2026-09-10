export const filterExistingRelated = (relatedItems = [], contentItems = []) =>
{
  const currentUrls = new Set(contentItems.map((item) => item.url || item.page?.url));
  return relatedItems.filter((item) => currentUrls.has(item.url));
};
