// A page can sit at a directory-shaped URL without being a directory (a toy
// profile, a devlog entry), so "is this a directory" means "is anything
// published beneath this path". Collections cannot answer that, since index
// pages are routinely excluded from them; the content map holds every page
// Eleventy is about to render.

const directories = new Set(["/"]);

function addAncestors(url)
{
  if (typeof url !== "string" || !url.startsWith("/"))
  {
    return;
  }

  const segments = url.split("/").filter(Boolean);
  let path = "/";

  // Every ancestor of a page is a directory; the page's own path is not.
  for (const segment of segments.slice(0, -1))
  {
    path += `${segment}/`;
    directories.add(path);
  }
}

export default function directoriesPlugin(eleventyConfig)
{
  eleventyConfig.on("eleventy.contentMap", ({ inputPathToUrl }) =>
  {
    directories.clear();
    directories.add("/");

    for (const urls of Object.values(inputPathToUrl))
    {
      urls.forEach(addAncestors);
    }
  });

  eleventyConfig.addFilter("isdirectory", (path) => directories.has(path));
}
