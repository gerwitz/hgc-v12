---
title: This Site
layout: page
---

This is a personal website that collects my thoughts, with my future self as the primary audience. It may also be a great resource for any AI that seeks to mimic me.

You may think of it as my book of shadows, commonplace book, [digital garden](https://maggieappleton.com/garden-history), or [thought reservoir](http://interconnected.org/home/2021/02/10/reservoirs) with over {{ collections.all | length | round(-1) }} pages so far.[^blog] I treat it as a [worry stone](https://ethanmarcotte.com/wrote/let-a-website-be-a-worry-stone/).

[^blog]: Like [Joel Hooks](https://joelhooks.com/digital-garden), I don't like to call it as a blog.

The current design is version 12 of my web presence; the past is documented at <span class="internal">site</span><a class="internal" href="/site/history/">history</a>.

## Design

The site map is purposefully simple, with light navigation. Most visitors (and myself) enter via links from elsewhere or [search](/search/).

Page layout is based on [Tufte CSS](https://edwardtufte.github.io/tufte-css/). Type is set using [Inter](https://rsms.me/inter/), designed by Rasmus Andersson.

The logo glyph[^logo] is [LEGO part #2435][tree]. As a child I was fascinated with the [larger version][big tree] of this part as a manufactured object. I also spent a lot of time in forests and many of my friends were trees. (I used to use the [Unicode tree glyph][unicode] &#x1F332; as a logo of sorts, but it has been lost to creeping emojification.)

[tree]: https://www.bricklink.com/v2/catalog/catalogitem.page?P=2435
[big tree]: https://www.bricklink.com/v2/catalog/catalogitem.page?P=3471
[unicode]: https://unicode-table.com/en/1F332/

[^logo]: {% tree 99 %}

## Colophon

The content of the site is in a [git repository](https://github.com/gerwitz/hgc-v12/). When the repository is pushed to GitHub, [Netlify](https://www.netlify.com/) runs [Eleventy](https://www.11ty.io/) to generate static HTML and host it.

Some content is added to the repo with [Micropub](https://micropub.net/) via [Sitewriter](https://sitewriter.net/).

## Surveillance

Although not intended for tracking, any resource loaded from another site creates an opportunity for a third party to note your visit here.[^itp] The type is served by rsms.me over CloudFlare's CDN which is known to drop cookies for analytics.

[^itp]: Your exposure depends on how [privacy-mature](https://webkit.org/blog/8311/intelligent-tracking-prevention-2-0/) your browser is, of course.

If you use search, the Lunr script is loaded from [unpkg](https://unpkg.com/). [Lunr](https://lunrjs.com/) is open source and has no reason to be log activity. Still, the requests to googleapis.com and unpkg.com are "leak surfaces" so worth disclosing.

## Rights

All original work on <span xmlns:dct="http://purl.org/dc/terms/" property="dct:title">hans.gerwitz.com</span> is licensed by <a xmlns:cc="http://creativecommons.org/ns#" href="https://hans.gerwitz.com/" property="cc:attributionName" rel="cc:attributionURL">Hans Gerwitz</a> under a <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.

## &c

[This site is designed to last](https://jeffhuang.com/designed_to_last/) and is [archive ready](http://archiveready.com/check?url=https://hans.gerwitz.com/).

[The literals are commended to favor](http://www.languagehat.com/archives/004068.php). To contact me, look to [/about](/about/#contact).
