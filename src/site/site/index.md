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
<span class="marginnote">{% tree 99 %}</span>

[tree]: https://www.bricklink.com/v2/catalog/catalogitem.page?P=2435
[big tree]: https://www.bricklink.com/v2/catalog/catalogitem.page?P=3471
[unicode]: https://unicode-table.com/en/1F332/

## Colophon

The content of the site is in a [git repository](https://github.com/gerwitz/hgc-v12/). When the repository is pushed to GitHub, [Netlify](https://www.netlify.com/) runs [Eleventy](https://www.11ty.io/) to generate static HTML and host it.

Some content is added to the repo with [Micropub](https://micropub.net/) via [Sitewriter](https://sitewriter.net/).

## Surveillance

An external script is loaded from [Hypothesis](https://hypothes.is/) for highlighting and annotations. Check out their [privacy policy](https://web.hypothes.is/privacy/) for details.

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

All original work on <span xmlns:dct="http://purl.org/dc/terms/" property="dct:title">hans.gerwitz.com</span> is licensed by <a xmlns:cc="http://creativecommons.org/ns#" href="https://hans.gerwitz.com/" property="cc:attributionName" rel="cc:attributionURL">Hans Gerwitz</a> under a <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.

[The literals are commended to favor](http://www.languagehat.com/archives/004068.php). To contact me, look to [/about](/about/).
