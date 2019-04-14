---
title: Colophon
layout: page
---

## The Tree

<svg width="64" height="99" viewbox="0 0 128 198" version="1" xmlns="http://www.w3.org/2000/svg"><path d="M112 198v-8c0-4-4-8-8-8H84c-4 0-8-4-8-8v-12h52l-4-12H75v-12h45l-4-12H75v-12h37l-4-12H75V90h29l-4-12H75V66h21l-4-12H75V42h13l-4-12H74V18h2V6c0-4-6-6-12-6S52 2 52 6v12h2v12H44l-4 12h13v12H36l-4 12h21v12H28l-4 12h29v12H20l-4 12h37v12H12l-4 12h45v12H4l-4 12h52v12c0 4-4 8-8 8H24c-4 0-8 4-8 8v8h96" fill="#00852B" fill-rule="evenodd"/></svg>

The favicon is [LEGO part #2435][tree]. As a child was fascinated with the [larger LEGO tree][big tree] as a manufactured object. I also spent a lot of time in forests and many of my friends were trees. (I used to use the [Unicode tree glyph][unicode] as a logo of sorts, but it has been lost to creeping emojification.)

[tree]: https://www.bricklink.com/v2/catalog/catalogitem.page?P=2435
[big tree]: https://www.bricklink.com/v2/catalog/catalogitem.page?P=3471
[unicode]: https://unicode-table.com/en/1F332/

## Infrastructure

This site is generated as static HTML via [Middleman][], and [the source is available on GitHub][source].

[middleman]: https://middlemanapp.com/
[source]: https://github.com/gerwitz/hans.gerwitz.com/

Search is kept local thanks to [lunr][].

[lunr]: https://lunrjs.com/

When I publish to a specific git branch, [Travis CI][travis] builds the site and deploys to Amazon S3. Cloudfront serves it to you.

[travis]: https://travis-ci.org/

One of the ways I publish is with [Sitewriter][].

[sitewriter]: https://sitewriter.net/

## Third Parties

Type is served by the [Font Library](https://fontlibrary.org/).

![listener](rat-mic.png)
[Google Analytics][goog] is used for usage tracking and may drop a cookie on you. I've set my account to [not share tracking data][ua], but you have no way to validate that and I have no way to confirm that Google honors this setting. I plan to replace this with direct log analysis.

Other external resources are referenced, including [Twitter's][twttr] scripts for explicit pop-ups and jQuery from [their CDN][jquery]. On the [homepage](/) a [Flickr][] script is loaded which insists on loading a Yahoo geolocation script as well as requested assets. None of these should be using this to track you, but my control is limited so YMMV.

[goog]: http://www.google.com/analytics/
[ua]: https://support.google.com/analytics/answer/1011397?hl=en
[twttr]: https://dev.twitter.com/docs/intents
[jquery]: https://code.jquery.com/
[flickr]: http://www.flickr.com/badge.gne

## &c.

The [site history page](history.html) provides background.

All original work is licensed by Hans Gerwitz under <a rel="license" href="http://creativecommons.org/licenses/by/3.0/deed.en_US">CC BY 3.0</a>.

[The literals are commended to favor](http://www.languagehat.com/archives/004068.php).
