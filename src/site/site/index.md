---
title: About This Site
layout: page
---

This is a personal website, primarily for my own recollection. Think of it as my book of shadows, with over {{ collections.all | length | round(-1) }} pages so far.

The current design is version 12 of my web presence; the past is documented in [Site History](history.html).

## Design

The site map is deliberately simple, with light navigation. Most visitors (and myself) enter via page links or search.

Page layout is based on [Tufte CSS](https://edwardtufte.github.io/tufte-css/), using widely available system fonts.

The rubrication glyph and favicon is [LEGO part #2435][tree]. As a child was fascinated with the larger version as a manufactured object. I also spent a lot of time in forests and many of my friends were trees. (I used to use the [Unicode tree glyph][unicode] as a logo of sorts, but it has been lost to creeping emojification.)
<span class="marginnote">
<svg width="64" height="99" viewbox="0 0 128 198" version="1" xmlns="http://www.w3.org/2000/svg"><path d="M112 198v-8c0-4-4-8-8-8H84c-4 0-8-4-8-8v-12h52l-4-12H75v-12h45l-4-12H75v-12h37l-4-12H75V90h29l-4-12H75V66h21l-4-12H75V42h13l-4-12H74V18h2V6c0-4-6-6-12-6S52 2 52 6v12h2v12H44l-4 12h13v12H36l-4 12h21v12H28l-4 12h29v12H20l-4 12h37v12H12l-4 12h45v12H4l-4 12h52v12c0 4-4 8-8 8H24c-4 0-8 4-8 8v8h96" fill="#00852B" fill-rule="evenodd"/></svg>
</span>

[tree]: https://www.bricklink.com/v2/catalog/catalogitem.page?P=2435
[big tree]: https://www.bricklink.com/v2/catalog/catalogitem.page?P=3471
[unicode]: https://unicode-table.com/en/1F332/

## Colophon

The content of the site is in a [git repository](https://github.com/gerwitz/hgc-v12/). When the repository is pushed to GitHub, [Netlify](https://www.netlify.com/) runs [Eleventy](https://www.11ty.io/) to generate static HTML and host it.

Some content is added to the repo with [Micropub](https://micropub.net/) via [Sitewriter](https://sitewriter.net/).

## Surveillance

<span class="marginnote">![listener](rat-mic.png)</span>
[Google Analytics](https://www.google.com/analytics/) is used for usage tracking and may drop a cookie on you. I've set my account to [not share tracking data][ua], but you have no way to validate that and I have no way to confirm that Google honors this setting. I hope to replace this with direct log analysis.

<!--
Other external resources are referenced, including [Twitter's][twttr] scripts for explicit pop-ups and jQuery from [their CDN][jquery]. On the [homepage](/) a [Flickr][] script is loaded which insists on loading a Yahoo geolocation script as well as requested assets. None of these should be using this to track you, but my control is limited so YMMV.

[ua]: https://support.google.com/analytics/answer/1011397?hl=en
[twttr]: https://dev.twitter.com/docs/intents
[jquery]: https://code.jquery.com/
[flickr]: http://www.flickr.com/badge.gne
-->

## Rights

All original work on <div class="license"><span xmlns:dct="http://purl.org/dc/terms/" property="dct:title">hans.gerwitz.com</span> is licensed by <a xmlns:cc="http://creativecommons.org/ns#" href="https://hans.gerwitz.com/" property="cc:attributionName" rel="cc:attributionURL">Hans Gerwitz</a> under a <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.</div>

[The literals are commended to favor](http://www.languagehat.com/archives/004068.php). To contact me, look to [/about](/about/).
