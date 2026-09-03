---
title: This Site
layout: page
---

<div class="web-badge">
  <img class="80x15" width="80" height="15" src="data:image/gif;base64,R0lGODdhUAAPAPEAAGZmZv///wCFKg0NDSwAAAAAUAAPAEACjYSPqcvtD08Ioloxw9B8bz59oJeR3TlmYYmChmqp8kzX9o3jb873/k/bAYfE4kR4wbBIHqZMBEqJTNDpUtM8AijJmPELDkTG5LJ5EU6rM8KJcg33tSkz6mpUHTT395OeX/IhyCK2BVOnh8U0uMT3t+IUVXUVOfdGiZKFF5LIaIdH5UloGVfKM2eaegNQAAA7" alt="80x50 button" style="image-rendering: pixelated;"/>
</div>

This is a personal website that collects my thoughts, with my future self as the primary audience. It may also be a great resource for any AI that seeks to mimic me.

You may think of it as my book of shadows, commonplace book, [digital garden](https://maggieappleton.com/garden-history), or [thought reservoir](http://interconnected.org/home/2021/02/10/reservoirs) with over {{ collections.all | length | round(-2) }} pages so far.[^blog] I treat it as a [worry stone](https://ethanmarcotte.com/wrote/let-a-website-be-a-worry-stone/).

[^blog]: Like [Joel Hooks](https://joelhooks.com/digital-garden), I no longer like to call it a blog.

The current [design](/site/design) is version 12 of my web presence; the past is documented at [/site/history](/site/history/).

## Colophon

[This site is designed to last](https://jeffhuang.com/designed_to_last/).

Content is kept in a [git repository](https://github.com/gerwitz/hgc-v12/) using simple Markdown as often as possible. When the repository is pushed to GitHub, [Netlify](https://www.netlify.com/) runs [Eleventy](https://www.11ty.io/) to generate static HTML.

Some posts are added to the repo with [Micropub](https://micropub.net/) via an instance of [IndieKit](https://getindiekit.com/) deployed on [Railway](https://railway.app/).

## Surveillance

This site is served via a VPS (virtual private server) on Hetzner, from their Helsinki data center. I trust they are not intercepting traffic or compromising the container I run inside that VPS.

I no longer use Cloudflare as a CDN because I don't like how much of a monopoly they're forming, and there isn't enough traffic to worry anyway.

That's it! I don't have any analytics "pixels" or drop cookies or whatever. Fonts and scripts are served from my static server. I've made a concerted effort to exclude any third parties; there is no reason for anyone else to be involved in you reading my site.

## Rights

All original work on <span xmlns:dct="http://purl.org/dc/terms/" property="dct:title">hans.gerwitz.com</span> is copyrighted by me, <a xmlns:cc="http://creativecommons.org/ns#" href="https://hans.gerwitz.com/" property="cc:attributionName" rel="cc:attributionURL">Hans Gerwitz</a>, and licensed by  under the <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.

## &c

[The literals are commended to favor](http://www.languagehat.com/archives/004068.php). To contact me, look to [/about](/about/#contact).
