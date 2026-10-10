import { parseHTML } from "linkedom";

import { createMarkdownLibrary } from "./markdown.js";

const markdown = createMarkdownLibrary();
const DEFAULT_WEB_ORIGIN = "https://hans.gerwitz.com";
const inlineElements = new Set(["p", "a", "span", "strong", "em", "s", "del", "li", "dt", "dd", "th", "td", "figcaption", "h1", "h2", "h3", "h4", "h5", "h6"]);
const blockElements = new Set(["p", "ul", "ol", "dl", "blockquote", "figure", "table", "pre", "hr", "h1", "h2", "h3", "h4", "h5", "h6"]);

// Emit text as strings, not executable Typst markup, including in document titles.
export const typstString = (value) =>
{
  const escapes = { "\\": "\\\\", '"': '\\"', "\n": "\\n", "\r": "\\r", "\t": "\\t" };
  const escaped = String(value ?? "").replace(/[\\"\u0000-\u001f\u007f]/g, (character) =>
    escapes[character] || `\\u{${character.codePointAt(0).toString(16)}}`);

  return `"${escaped}"`;
};

const renderChildren = (node, context) => Array.from(node.childNodes)
  .map((child) => renderNode(child, context)).join("");

const block = (content) => content.trim() ? `${content.trim()}\n\n` : "";
const link = (url, body, context) => `#link(${typstString(new URL(url, context.sourceUrl).href)})[${body}]`;

const renderFootnote = (id, context) =>
{
  if (context.footnoteLabels.has(id))
  {
    return `#footnote(<${context.footnoteLabels.get(id)}>)`;
  }

  const label = `md-footnote-${context.footnoteLabels.size + 1}`;
  context.footnoteLabels.set(id, label);

  return `#footnote[${renderChildren(context.footnotes.get(id), context).trim()}]<${label}>`;
};

const renderList = (node, context) =>
{
  const items = Array.from(node.children).filter((child) => child.localName === "li");
  const ordered = node.localName === "ol";
  const start = ordered ? `start: ${Number(node.getAttribute("start") || 1)}, ` : "";
  const contents = items.map((item) => `[${renderChildren(item, context).trim()}]`);

  return block(`#${ordered ? "enum" : "list"}(${start}${contents.join(", ")})`);
};

const renderTerms = (node, context) =>
{
  const items = [];

  for (const child of node.children)
  {
    if (child.localName === "dt")
    {
      items.push({ term: renderChildren(child, context), descriptions: [] });
    }
    else if (child.localName === "dd" && items.length)
    {
      items.at(-1).descriptions.push(renderChildren(child, context).trim());
    }
  }

  return block(`#terms(${items.map((item) =>
    `terms.item([${item.term}], [${item.descriptions.join("\n\n")}])`).join(", ")})`);
};

const renderTable = (node, context) =>
{
  const rows = Array.from(node.querySelectorAll("tr"));
  const columns = rows[0]?.children.length || 0;

  if (!columns)
  {
    return "";
  }

  const cells = rows.flatMap((row) => Array.from(row.children).map((cell) =>
  {
    const content = renderChildren(cell, context).trim();
    return `[${cell.localName === "th" ? `#strong[${content}]` : content}]`;
  }));

  return block(`#table(columns: ${columns}, ${cells.join(", ")})`);
};

const renderNode = (node, context) =>
{
  if (node.nodeType === 3)
  {
    let text = node.textContent.replace(/[ \t\r\n]+/g, " ");

    if (blockElements.has(node.previousSibling?.localName))
    {
      text = text.trimStart();
    }

    if (blockElements.has(node.nextSibling?.localName))
    {
      text = text.trimEnd();
    }

    if (!text || (!text.trim() && !inlineElements.has(node.parentNode?.localName)))
    {
      return "";
    }

    return `#text(${typstString(text)})`;
  }

  if (node.nodeType !== 1 || ["script", "style"].includes(node.localName)
    || node.classList.contains("footnote-backref")
    || (node.localName === "span" && node.classList.contains("sidenote-ref"))
    || (node.localName === "aside" && context.footnotes.has(node.id)))
  {
    return "";
  }

  if (/^h[1-6]$/.test(node.localName))
  {
    return block(`#heading(level: ${node.localName.slice(1)})[${renderChildren(node, context)}]`);
  }

  switch (node.localName)
  {
    case "p":
      return block(renderChildren(node, context));
    case "strong":
    case "b":
      return `#strong[${renderChildren(node, context)}]`;
    case "em":
    case "i":
      return `#emph[${renderChildren(node, context)}]`;
    case "s":
    case "del":
      return `#strike[${renderChildren(node, context)}]`;
    case "sup":
      return `#super[${renderChildren(node, context)}]`;
    case "sub":
      return `#sub[${renderChildren(node, context)}]`;
    case "br":
      return "#linebreak()";
    case "hr":
      return block("#block[#line(length: 100%)]");
    case "code":
    case "kbd":
      return `#raw(${typstString(node.textContent)})`;
    case "pre":
    {
      const code = node.querySelector("code");
      const language = code?.className.match(/(?:^|\s)language-(\S+)/)?.[1];
      const option = language ? `, lang: ${typstString(language)}` : "";
      return block(`#raw(${typstString(node.textContent.replace(/\r?\n$/, ""))}, block: true${option})`);
    }
    case "a":
    {
      const footnoteId = node.getAttribute("aria-describedby");

      if (node.getAttribute("role") === "doc-noteref" && context.footnotes.has(footnoteId))
      {
        return renderFootnote(footnoteId, context);
      }

      const body = renderChildren(node, context);
      const href = node.getAttribute("href");
      return href ? link(href, body, context) : body;
    }
    case "img":
    {
      // Typst cannot fetch remote images; keep documents self-contained with image links.
      const label = node.getAttribute("alt") || node.getAttribute("title") || "View image";
      const source = node.getAttribute("src");
      const body = `#text(${typstString(label)})`;
      return source ? link(source, body, context) : body;
    }
    case "figure":
    {
      const caption = Array.from(node.children).find((child) => child.localName === "figcaption");

      if (caption && node.querySelector("img"))
      {
        const body = Array.from(node.childNodes).filter((child) => child !== caption)
          .map((child) => renderNode(child, context)).join("").trim();
        return block(`#figure(kind: image, numbering: none, caption: [${renderChildren(caption, context)}])[${body}]`);
      }

      return block(renderChildren(node, context));
    }
    case "blockquote":
      return block(`#quote(block: true)[${renderChildren(node, context).trim()}]`);
    case "ul":
    case "ol":
      return renderList(node, context);
    case "dl":
      return renderTerms(node, context);
    case "table":
      return renderTable(node, context);
    default:
      return renderChildren(node, context);
  }
};

export const markdownToTypst = (source, sourceUrl = "/", configuration = {}) =>
{
  const body = String(source ?? "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  // Reuse the site's Markdown semantics, including rich captions and raw HTML links.
  const { document } = parseHTML(`<html><body>${markdown.render(body)}</body></html>`);
  const context = {
    sourceUrl: new URL(sourceUrl, configuration.webOrigin || DEFAULT_WEB_ORIGIN),
    footnotes: new Map(Array.from(document.querySelectorAll("aside.sidenote[id]"))
      .map((note) => [note.id, note])),
    footnoteLabels: new Map(),
  };
  const content = renderChildren(document.body, context).trim();

  return content ? `${content}\n` : "";
};
