import { parseHTML } from "linkedom";

const INTERNAL_HOSTS = new Set([
  "hans.gerwitz.com",
  "www.hans.gerwitz.com",
]);

const URL_ATTRIBUTES = [
  ["a[href]", "href"],
  ["area[href]", "href"],
  ["form[action]", "action"],
];

const DATED_CONTENT_PATH_PATTERN = /^\/\d{4}\/\d{2}\/\d{2}\/[^/.]+$/;
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

function splitSuffix(url)
{
  const suffixIndex = url.search(/[?#]/);
  if (suffixIndex === -1)
  {
    return [url, ""];
  }

  return [
    url.slice(0, suffixIndex),
    url.slice(suffixIndex),
  ];
}

function normalizePath(path)
{
  const [pathWithoutSuffix, suffix] = splitSuffix(path);
  if (!pathWithoutSuffix || pathWithoutSuffix.endsWith("/"))
  {
    return path;
  }

  const finalSegment = pathWithoutSuffix.split("/").pop();
  if (!finalSegment || finalSegment.includes("."))
  {
    return path;
  }

  if (DATED_CONTENT_PATH_PATTERN.test(pathWithoutSuffix))
  {
    return `${pathWithoutSuffix}.html${suffix}`;
  }

  return `${pathWithoutSuffix}/${suffix}`;
}

function normalizeUrl(url)
{
  if (!url || url.startsWith("#") || url.startsWith("//"))
  {
    return url;
  }

  if (SCHEME_PATTERN.test(url))
  {
    let parsedUrl;
    try
    {
      parsedUrl = new URL(url);
    } catch
    {
      return url;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol) || !INTERNAL_HOSTS.has(parsedUrl.hostname))
    {
      return url;
    }

    const normalizedPath = normalizePath(parsedUrl.pathname);
    if (normalizedPath === parsedUrl.pathname)
    {
      return url;
    }

    parsedUrl.pathname = normalizedPath;
    return parsedUrl.toString();
  }

  return normalizePath(url);
}

function normalizeDocumentUrls(content)
{
  const { document } = parseHTML(content);
  let hasChanges = false;

  for (const [selector, attribute] of URL_ATTRIBUTES)
  {
    for (const element of document.querySelectorAll(selector))
    {
      const url = element.getAttribute(attribute);
      const normalizedUrl = normalizeUrl(url);
      if (normalizedUrl !== url)
      {
        element.setAttribute(attribute, normalizedUrl);
        hasChanges = true;
      }
    }
  }

  for (const link of document.querySelectorAll("a.internal"))
  {
    if (link.textContent.trim().startsWith("/") && !link.classList.contains("path"))
    {
      link.classList.add("path");
      hasChanges = true;
    }
  }

  return hasChanges ? document.toString() : content;
}

export default function urlsPlugin(eleventyConfig)
{
  eleventyConfig.addTransform("normalize-internal-urls", function(content)
  {
    if (typeof this.page.outputPath !== "string" || !this.page.outputPath.endsWith(".html"))
    {
      return content;
    }

    return normalizeDocumentUrls(content);
  });
}
