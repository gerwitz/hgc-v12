import { parseHTML } from "linkedom";

import { createMarkdownLibrary } from "./markdown.js";

const DEFAULT_WEB_ORIGIN = "https://hans.gerwitz.com";
const markdown = createMarkdownLibrary();

const normalizeText = (value) => value
  .replace(/[ \t]+/g, " ")
  .replace(/ *\n */g, "\n")
  .trim();

const editionUrl = (value, context) => {
  if (!value) {
    return value;
  }

  const webUrl = new URL(value, new URL(context.sourceUrl, context.webOrigin));

  if (webUrl.origin !== new URL(context.webOrigin).origin) {
    return value;
  }

  if (!context.editionRoutes.has(webUrl.pathname)) {
    return webUrl.toString();
  }

  return `${geminiPath(webUrl.pathname)}${webUrl.search}${webUrl.hash}`;
};

const renderLinks = (links) => {
  return links
    .map(({ label, number, url }) => {
      // The reference number needs a following label or Gemtext treats it as the title.
      return `=> ${url} (${number}) ${label || url}`;
    })
    .join("\n");
};

const nextReferenceNumber = (context) => {
  const number = context.nextReferenceNumber;
  context.nextReferenceNumber += 1;
  return number;
};

const footnoteNumber = (token, context) => {
  const id = token.meta?.id ?? 0;

  if (!context.footnoteNumbers.has(id)) {
    context.footnoteNumbers.set(id, nextReferenceNumber(context));
  }

  return context.footnoteNumbers.get(id);
};

const matchingCloseIndex = (tokens, openIndex) => {
  let depth = 0;

  for (let index = openIndex; index < tokens.length; index += 1) {
    depth += tokens[index].nesting;

    if (depth === 0) {
      return index;
    }
  }

  return tokens.length - 1;
};

const renderInline = (tokens, context) => {
  let text = "";
  const links = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.type === "text" || token.type === "code_inline") {
      text += token.content;
      continue;
    }

    if (token.type === "softbreak" || token.type === "hardbreak") {
      text += "\n";
      continue;
    }

    if (token.type === "link_open") {
      const closeIndex = matchingCloseIndex(tokens, index);
      const rendered = renderInline(tokens.slice(index + 1, closeIndex), context);
      const anchorText = normalizeText(rendered.text);
      const linkTitle = normalizeText(token.attrGet("title") || "");
      const url = editionUrl(token.attrGet("href"), context);
      const number = nextReferenceNumber(context);

      text += `${anchorText}(${number})`;
      links.push(...rendered.links);

      if (url) {
        links.push({
          label: linkTitle || anchorText || url,
          number,
          url,
        });
      }

      index = closeIndex;
      continue;
    }

    if (token.type === "image") {
      const anchorText = token.content || "Image";
      const linkTitle = normalizeText(token.attrGet("title") || "");
      const url = editionUrl(token.attrGet("src"), context);
      const number = nextReferenceNumber(context);

      text += `${anchorText}(${number})`;

      if (url) {
        links.push({
          label: linkTitle || anchorText,
          number,
          url,
        });
      }

      continue;
    }

    if (token.type === "footnote_ref") {
      text += `(${footnoteNumber(token, context)})`;
      continue;
    }

    if (token.type === "figcaption_open") {
      index = matchingCloseIndex(tokens, index);
      continue;
    }

    if (token.type === "html_inline") {
      const { document } = parseHTML(`<html><body>${token.content}</body></html>`);
      text += document.body.textContent;
    }
  }

  return {
    links,
    text: normalizeText(text),
  };
};

const renderInlineBlock = (token, context, prefix = "") => {
  const rendered = renderInline(token.children || [], context);
  const parts = [];

  if (rendered.text) {
    parts.push(`${prefix}${rendered.text}`);
  }

  if (rendered.links.length) {
    parts.push(renderLinks(rendered.links));
  }

  return parts.join("\n");
};

const renderLinkOnlyListItem = (tokens, openIndex, closeIndex, context) => {
  const itemTokens = tokens.slice(openIndex + 1, closeIndex);

  if (itemTokens.length !== 3
    || itemTokens[0].type !== "paragraph_open"
    || itemTokens[1].type !== "inline"
    || itemTokens[2].type !== "paragraph_close") {
    return null;
  }

  const inlineTokens = itemTokens[1].children || [];

  if (inlineTokens[0]?.type !== "link_open"
    || inlineTokens.at(-1)?.type !== "link_close"
    || matchingCloseIndex(inlineTokens, 0) !== inlineTokens.length - 1
    || inlineTokens.slice(1, -1).some((token) => ["link_open", "image", "footnote_ref"].includes(token.type))) {
    return null;
  }

  const url = editionUrl(inlineTokens[0].attrGet("href"), context);

  if (!url) {
    return null;
  }

  const title = normalizeText(inlineTokens[0].attrGet("title") || "");
  const text = renderInline(inlineTokens.slice(1, -1), context).text;

  // A direct Gemtext link needs no numbered reference or duplicate bullet text.
  return `=> ${url} ${title || text || url}`;
};

const renderList = (tokens, openIndex, closeIndex, context) => {
  const items = [];

  for (let index = openIndex + 1; index < closeIndex; index += 1) {
    if (tokens[index].type !== "list_item_open") {
      continue;
    }

    const itemCloseIndex = matchingCloseIndex(tokens, index);
    const link = renderLinkOnlyListItem(tokens, index, itemCloseIndex, context);

    if (link) {
      items.push(link);
      index = itemCloseIndex;
      continue;
    }

    const content = renderBlocks(tokens, context, index + 1, itemCloseIndex);
    const lines = content.split("\n");
    const firstTextIndex = lines.findIndex((line) => line && !line.startsWith("=>"));

    if (firstTextIndex >= 0) {
      lines[firstTextIndex] = `* ${lines[firstTextIndex]}`;
    }

    items.push(lines.join("\n"));
    index = itemCloseIndex;
  }

  return items.join("\n");
};

const renderBlockquote = (tokens, openIndex, closeIndex, context) => {
  return renderBlocks(tokens, context, openIndex + 1, closeIndex)
    .split("\n")
    .map((line) => {
      if (!line || line.startsWith("=>")) {
        return line;
      }

      return `> ${line}`;
    })
    .join("\n");
};

const renderHtmlBlock = (html) => {
  const { document } = parseHTML(`<html><body>${html}</body></html>`);
  return normalizeText(document.body.textContent);
};

const renderBlocks = (tokens, context, startIndex = 0, endIndex = tokens.length) => {
  const blocks = [];

  for (let index = startIndex; index < endIndex; index += 1) {
    const token = tokens[index];

    if (token.type === "heading_open") {
      const level = Number(token.tag.slice(1));
      blocks.push(`${"#".repeat(level)} ${renderInlineBlock(tokens[index + 1], context)}`);
      index += 2;
      continue;
    }

    if (token.type === "paragraph_open") {
      blocks.push(renderInlineBlock(tokens[index + 1], context));
      index += 2;
      continue;
    }

    if (token.type === "inline") {
      blocks.push(renderInlineBlock(token, context));
      continue;
    }

    if (token.type === "blockquote_open") {
      const closeIndex = matchingCloseIndex(tokens, index);
      blocks.push(renderBlockquote(tokens, index, closeIndex, context));
      index = closeIndex;
      continue;
    }

    if (token.type === "bullet_list_open" || token.type === "ordered_list_open") {
      const closeIndex = matchingCloseIndex(tokens, index);
      blocks.push(renderList(tokens, index, closeIndex, context));
      index = closeIndex;
      continue;
    }

    if (token.type === "fence" || token.type === "code_block") {
      blocks.push(`\`\`\`\n${token.content.trimEnd()}\n\`\`\``);
      continue;
    }

    if (token.type === "hr") {
      blocks.push("---");
      continue;
    }

    if (token.type === "html_block") {
      blocks.push(renderHtmlBlock(token.content));
      continue;
    }

    if (token.type === "footnote_open") {
      const closeIndex = matchingCloseIndex(tokens, index);
      const content = renderBlocks(tokens, context, index + 1, closeIndex);
      blocks.push(`(${footnoteNumber(token, context)}) ${content}`);
      index = closeIndex;
      continue;
    }

    if (token.type === "dt_open") {
      blocks.push(renderInlineBlock(tokens[index + 1], context));
      index += 2;
      continue;
    }

    if (token.type === "dd_open") {
      const closeIndex = matchingCloseIndex(tokens, index);
      blocks.push(renderBlocks(tokens, context, index + 1, closeIndex));
      index = closeIndex;
      continue;
    }

    if (token.type === "blockquote_attribution_open") {
      blocks.push(`— ${renderInlineBlock(tokens[index + 1], context)}`);
      index += 2;
    }
  }

  return blocks.filter(Boolean).join("\n\n");
};

const withoutFrontMatter = (source) => {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
};

const createRenderingContext = (sourceUrl, configuration, collections) => {
  const editionRoutes = new Set(configuration.routes || []);

  for (const collectionName of configuration.collections || []) {
    for (const item of collections[collectionName] || []) {
      if (item.url) {
        editionRoutes.add(item.url);
      }
    }
  }

  return {
    editionRoutes,
    footnoteNumbers: new Map(),
    nextReferenceNumber: 1,
    sourceUrl,
    webOrigin: configuration.webOrigin || DEFAULT_WEB_ORIGIN,
  };
};

export const markdownToGemtext = (
  source,
  sourceUrl = "/",
  configuration = {},
  collections = {}
) => {
  const tokens = markdown.parse(withoutFrontMatter(source || ""), {});
  const context = createRenderingContext(sourceUrl, configuration, collections);

  return `${renderBlocks(tokens, context).trim()}\n`;
};

export const geminiPath = (url) => {
  if (!url || url === "/") {
    return "/index.gmi";
  }

  if (url.endsWith("/")) {
    return `${url}index.gmi`;
  }

  return url.replace(/\.[^/.]+$/, ".gmi");
};
