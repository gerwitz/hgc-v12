import { geminiPath } from "../../../eleventy/gemtext.js";

export default class GeminiRedirects {
  data()
  {
    return {
      permalink: "/editions/gemini/redirects.json",
      layout: false,

    };
  }

  render(data)
  {
    const redirects = {
      "/writing": "/gemlog/archive/",
      "/writing/": "/gemlog/archive/",
      "/writing/index.gmi": "/gemlog/archive/",
      "/posts": "/gemlog/archive/",
      "/posts/": "/gemlog/archive/",
      "/posts/index.gmi": "/gemlog/archive/",
    };

    for (const entry of data.collections.gemlog)
    {
      for (const alias of entry.geminiAliases || [])
      {
        redirects[alias] = entry.geminiUrl;
      }

      if (entry.data.tags.includes("writing"))
      {
        redirects[geminiPath(entry.url)] = entry.geminiUrl;
      }
    }

    return JSON.stringify(redirects, null, 2);
  }
}
