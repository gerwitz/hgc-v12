---
title: This Site
layout: page
---

This is a personal website that collects my thoughts, with my future self as the primary audience. It may also be a great resource for any AI that seeks to mimic me.

Think of it as my book of shadows, with over {{ collections.all | length | round(-1) }} pages so far.

The current design is version 12 of my web presence; the past is documented at [/site/history](history/).

## Design

The site map is deliberately simple, with light navigation. Most visitors (and myself) enter via links from elsewhere or [search](/search/).

Page layout is based on [Tufte CSS](https://edwardtufte.github.io/tufte-css/), using widely available system fonts.

The favicon is [LEGO part #2435][tree]. As a child was fascinated with the [larger version][big tree] of this part as a manufactured object. I also spent a lot of time in forests and many of my friends were trees. (I used to use the [Unicode tree glyph][unicode] as a logo of sorts, but it has been lost to creeping emojification.)
<span class="marginnote">{% tree 99 %}</span>

[tree]: https://www.bricklink.com/v2/catalog/catalogitem.page?P=2435
[big tree]: https://www.bricklink.com/v2/catalog/catalogitem.page?P=3471
[unicode]: https://unicode-table.com/en/1F332/

## Colophon

The content of the site is in a [git repository](https://github.com/gerwitz/hgc-v12/). When the repository is pushed to GitHub, [Netlify](https://www.netlify.com/) runs [Eleventy](https://www.11ty.io/) to generate static HTML and host it.

Some content is added to the repo with [Micropub](https://micropub.net/) via [Sitewriter](https://sitewriter.net/).

## Surveillance

<span class="marginnote">![listener](rat-mic.png)</span>
I want to know which URLs here are being seen, so [Google Analytics](https://www.google.com/analytics/) will see you and drop a cookie. I've set my account to [not share tracking data](https://support.google.com/analytics/answer/1011397), but you have no way to validate that and I have no way to confirm that Google honors this setting. I also set the cookie to limit to gerwitz.com and configured the client script to [anonymize IP](https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#anonymizeIp). (I hope to eventually replace this with direct log analysis.)


Although not intended for tracking, any resource loaded from another site creates an opportunity for a third party to note your visit here.[^itp] So note that [instant.page](https://instant.page/) is loaded from their server. I review each version before updating and they are hosting from the static GitHub Pages servers, so there shouldn't be any tracking. Still, this is an "attack surface" and they don't yet publish a privacy policy. Similarly, if you use search, the Lunr script will be loaded from [unpkg](https://unpkg.com/).

[^itp]: Your exposure depends on how [privacy-mature](https://webkit.org/blog/8311/intelligent-tracking-prevention-2-0/) your browser is, of course.


<!--
Other external resources are referenced, including [Twitter's][twttr] scripts for explicit pop-ups and jQuery from [their CDN][jquery]. On the [homepage](/) a [Flickr][] script is loaded which insists on loading a Yahoo geolocation script as well as requested assets. None of these should be using this to track you, but my control is limited so YMMV.

[twttr]: https://dev.twitter.com/docs/intents
[jquery]: https://code.jquery.com/
[flickr]: http://www.flickr.com/badge.gne
-->

## Rights

All original work on <span xmlns:dct="http://purl.org/dc/terms/" property="dct:title">hans.gerwitz.com</span> is licensed by <a xmlns:cc="http://creativecommons.org/ns#" href="https://hans.gerwitz.com/" property="cc:attributionName" rel="cc:attributionURL">Hans Gerwitz</a> under a <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.

[The literals are commended to favor](http://www.languagehat.com/archives/004068.php). To contact me, look to [/about](/about/#contact).
