const getPreviewItem = (context, itemOrUrl, shortcodeName) => {
  if (typeof itemOrUrl === "string") {
    const item = context.ctx.collections.all.find((collectionItem) => {
      return collectionItem.url === itemOrUrl;
    });

    if (!item) {
      throw new Error(
        `${shortcodeName} could not find a rendered item at "${itemOrUrl}". Use the item's current canonical permalink.`,
      );
    }

    return item;
  }

  if (!itemOrUrl || typeof itemOrUrl !== "object" || typeof itemOrUrl.url !== "string") {
    throw new Error(
      `${shortcodeName} requires an Eleventy collection item or a canonical permalink.`,
    );
  }

  return itemOrUrl;
};

const WRITING_ICON_NAMES = new Set(["work", "culture", "personal"]);

export const getPreviewIconName = (item) => {
  const tags = Array.isArray(item.data.tags) ? item.data.tags : [];

  if (tags.includes("notes"))
  {
    return "note";
  }

  if (tags.includes("logs"))
  {
    return "log";
  }

  if (tags.includes("projects"))
  {
    return "project";
  }

  if (tags.includes("lists"))
  {
    return "list";
  }

  if (tags.includes("writing"))
  {
    const categories = Array.isArray(item.data.categories) ? item.data.categories : [];
    return categories.find((category) => WRITING_ICON_NAMES.has(category)) || "other";
  }

  return "other";
};

const renderPreview = function(templateName, itemOrUrl, shortcodeName) {
  const item = getPreviewItem(this, itemOrUrl, shortcodeName);

  item.data.previewIconName = getPreviewIconName(item);

  return this.env.render(templateName, {
    ...this.ctx,
    item,
  });
};

// Render a compact linked preview for an item or canonical permalink.
export function previewSmall(itemOrUrl) {
  return renderPreview.call(this, "preview-small.njk", itemOrUrl, "previewSmall");
}

// Render a title and available metadata for an item or canonical permalink.
export function previewMedium(itemOrUrl) {
  return renderPreview.call(this, "preview-medium.njk", itemOrUrl, "previewMedium");
}

// Render a title, available metadata, and summary for an item or canonical permalink.
export function previewLarge(itemOrUrl) {
  return renderPreview.call(this, "preview-large.njk", itemOrUrl, "previewLarge");
}
