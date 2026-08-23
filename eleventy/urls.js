
const INTERNAL_HOSTS = new Set([
  "hans.gerwitz.com",
  "www.hans.gerwitz.com",
]);


const DATED_CONTENT_PATH_PATTERN = /^\/\d{4}\/\d{2}\/\d{2}\/[^/.]+$/;
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
const HTML_TAG_PATTERN = /<(a|area|form)(?=[\s/>])(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const URL_ATTRIBUTE_PATTERN = /(\s(?:href|action)\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
const ANCHOR_PATTERN = /<a(?=[\s/>])((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/a\s*>/gi;
const CLASS_ATTRIBUTE_PATTERN = /(\sclass\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i;

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

function getNormalizedTag(tag, elementName)
{
  const attributeName = elementName === "form" ? "action" : "href";

  return tag.replace(URL_ATTRIBUTE_PATTERN, (match, prefix, doubleQuotedUrl, singleQuotedUrl, unquotedUrl) =>
  {
    if (!prefix.toLowerCase().includes(attributeName))
    {
      return match;
    }

    const url = doubleQuotedUrl ?? singleQuotedUrl ?? unquotedUrl;
    const normalizedUrl = normalizeUrl(url);
    if (normalizedUrl === url)
    {
      return match;
    }

    if (doubleQuotedUrl !== undefined)
    {
      return `${prefix}"${normalizedUrl}"`;
    }

    if (singleQuotedUrl !== undefined)
    {
      return `${prefix}'${normalizedUrl}'`;
    }

    return `${prefix}${normalizedUrl}`;
  });
}

function getPathClassAnchor(anchor, attributes, content)
{
  const classMatch = attributes.match(CLASS_ATTRIBUTE_PATTERN);
  if (!classMatch)
  {
    return anchor;
  }

  const classNames = classMatch[2] ?? classMatch[3] ?? classMatch[4];
  if (!classNames.split(/\s+/).includes("internal") || classNames.split(/\s+/).includes("path"))
  {
    return anchor;
  }

  const linkText = content.replace(/<[^>]*>/g, "").trim();
  if (!linkText.startsWith("/"))
  {
    return anchor;
  }

  const updatedAttributes = attributes.replace(CLASS_ATTRIBUTE_PATTERN, (match, prefix, doubleQuotedClasses, singleQuotedClasses, unquotedClasses) =>
  {
    const classes = doubleQuotedClasses ?? singleQuotedClasses ?? unquotedClasses;
    const updatedClasses = `${classes} path`;

    if (doubleQuotedClasses !== undefined)
    {
      return `${prefix}"${updatedClasses}"`;
    }

    if (singleQuotedClasses !== undefined)
    {
      return `${prefix}'${updatedClasses}'`;
    }

    return `${prefix}${updatedClasses}`;
  });

  return `<a${updatedAttributes}>${content}</a>`;
}

function normalizeDocumentUrls(content)
{
  const normalizedUrls = content.replace(HTML_TAG_PATTERN, (tag, elementName) =>
  {
    return getNormalizedTag(tag, elementName.toLowerCase());
  });

  return normalizedUrls.replace(ANCHOR_PATTERN, getPathClassAnchor);
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
