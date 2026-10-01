import { geminiPath } from "../../../eleventy/gemtext.js";

export default class GeminiRedirects {
  data()
  {
    return {
      permalink: "/editions/gemini/redirects.json",
      eleventyExcludeFromCollections: true,
    };
  }

  render(data)
  {
    const redirects = {
      "/writing": "/posts/",
      "/writing/": "/posts/",
      "/writing/index.gmi": "/posts/",
    };

    for (const entry of data.collections.gemlog)
    {
      if (entry.data.tags.includes("writing"))
      {
        redirects[geminiPath(entry.url)] = entry.geminiUrl;
      }
    }

    return JSON.stringify(redirects, null, 2);
  }
}
