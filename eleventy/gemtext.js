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

  const mappedUrl = context.editionUrls.get(webUrl.pathname);

  if (mappedUrl)
  {
    return `${mappedUrl}${webUrl.search}${webUrl.hash}`;
  }

  if (!context.editionRoutes.has(webUrl.pathname)) {
    return webUrl.toString();
  }

  return `${geminiPath(webUrl.pathname)}${webUrl.search}${webUrl.hash}`;
};

const renderFigure = (token, context) =>
{
  const image = (token.children || []).find((child) => child.type === "image");

  if (!image)
  {
    return renderInlineBlock(token, context);
  }

  const source = image.attrGet("src");
  const webUrl = new URL(source, new URL(context.sourceUrl, context.webOrigin));
  // Calmserve serves the same media paths over Gemini; do not map them to .gmi.
  const url = webUrl.origin === new URL(context.webOrigin).origin
    && webUrl.pathname.startsWith("/media/")
    ? `gemini://${webUrl.hostname}${webUrl.pathname}${webUrl.search}${webUrl.hash}`
    : editionUrl(source, context);
  const label = normalizeText(image.attrGet("title") || image.content || "Image");

  return `=> ${url} ${label}`;
};

const superscriptNumber = (number) => String(number)
  .replace(/\d/g, (digit) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(digit)]);

const addReference = (context, reference) => {
  const number = context.references.length + 1;
  context.references.push({ ...reference, number });
  return number;
};

const footnoteNumber = (token, context) => {
  const id = token.meta?.id ?? 0;

  if (!context.footnoteNumbers.has(id)) {
    context.footnoteNumbers.set(id, addReference(context, { footnoteId: id }));
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
      text += anchorText;

      if (url)
      {
        const number = addReference(context, {
          label: linkTitle || anchorText || url,
          url,
        });
        text += superscriptNumber(number);
      }

      index = closeIndex;
      continue;
    }

    if (token.type === "image") {
      const anchorText = token.content || "Image";
      const linkTitle = normalizeText(token.attrGet("title") || "");
      const url = editionUrl(token.attrGet("src"), context);
      text += anchorText;

      if (url)
      {
        const number = addReference(context, {
          label: linkTitle || anchorText,
          url,
        });
        text += superscriptNumber(number);
      }

      continue;
    }

    if (token.type === "footnote_ref") {
      text += superscriptNumber(footnoteNumber(token, context));
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
    text: normalizeText(text),
  };
};

const renderInlineBlock = (token, context) => {
  return renderInline(token.children || [], context).text;
};

const renderLinkOnlyInline = (inlineTokens, context, labelPrefix = "") => {

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

  // A standalone link needs neither a reference number nor a duplicate text line.
  const label = title || text || url;
  return label === url && !labelPrefix ? `=> ${url}` : `=> ${url} ${labelPrefix}${label}`;
};

const renderLinkOnlyListItem = (tokens, openIndex, closeIndex, context) => {
  const itemTokens = tokens.slice(openIndex + 1, closeIndex);

  if (itemTokens.length !== 3
    || itemTokens[0].type !== "paragraph_open"
    || itemTokens[1].type !== "inline"
    || itemTokens[2].type !== "paragraph_close")
  {
    return null;
  }

  return renderLinkOnlyInline(itemTokens[1].children || [], context);
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
      const level = Math.max(Number(token.tag.slice(1)), context.minimumHeadingLevel);
      blocks.push(`${"#".repeat(level)} ${renderInlineBlock(tokens[index + 1], context)}`);
      index += 2;
      continue;
    }

    if (token.type === "figure_open")
    {
      blocks.push(renderFigure(tokens[index + 1], context));
      index = matchingCloseIndex(tokens, index);
      continue;
    }

    if (token.type === "paragraph_open") {
      const inlineToken = tokens[index + 1];
      blocks.push(renderLinkOnlyInline(inlineToken.children || [], context)
        || renderInlineBlock(inlineToken, context));
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

    if (token.type === "footnote_open")
    {
      const closeIndex = matchingCloseIndex(tokens, index);
      // Definitions may occur before later prose; defer their references until the body is complete.
      context.footnotes.set(token.meta?.id ?? 0, tokens.slice(index + 1, closeIndex));
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
      const inlineToken = tokens[index + 1];
      blocks.push(renderLinkOnlyInline(inlineToken.children || [], context, "— ")
        || `— ${renderInlineBlock(inlineToken, context)}`);
      index += 2;
    }
  }

  return blocks.filter(Boolean).join("\n\n");
};

const renderReferences = (context) => {
  const entries = [];

  // Rendering textual notes may append links; array iteration includes those new references.
  for (const reference of context.references)
  {
    const number = superscriptNumber(reference.number);

    if (reference.url)
    {
      entries.push(`=> ${reference.url} ${number} ${reference.label || reference.url}`);
    }
    else
    {
      const content = renderBlocks(context.footnotes.get(reference.footnoteId) || [], context);
      // Structural Gemtext markers must stay at the beginning of their lines.
      const separator = /^(?:=> |#|\* |> |```)/.test(content) ? "\n" : " ";
      entries.push(`${number}${separator}${content}`);
    }
  }

  if (!entries.length)
  {
    return "";
  }

  const headingLevel = Math.max(2, context.minimumHeadingLevel);
  return `${"#".repeat(headingLevel)} Footnotes\n\n${entries.join("\n")}`;
};

const withoutFrontMatter = (source) => {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
};

const createRenderingContext = (sourceUrl, configuration, collections) => {
  const editionRoutes = new Set(configuration.routes || []);
  const editionUrls = new Map(Object.entries(configuration.routeAliases || {}));

  for (const collectionName of configuration.collections || []) {
    for (const item of collections[collectionName] || []) {
      if (item.url) {
        editionRoutes.add(item.url);
      }

      // Capsule posts have canonical URLs independent of web publication paths.
      if (item.geminiUrl)
      {
        editionUrls.set(item.geminiUrl, item.geminiUrl);

        if (item.url)
        {
          editionUrls.set(item.url, item.geminiUrl);
        }
      }
    }
  }

  return {
    editionRoutes,
    editionUrls,
    footnoteNumbers: new Map(),
    footnotes: new Map(),
    minimumHeadingLevel: configuration.minimumHeadingLevel || 1,
    references: [],
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

  const body = renderBlocks(tokens, context).trim();
  const references = renderReferences(context);

  return `${[body, references].filter(Boolean).join("\n\n")}\n`;
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
