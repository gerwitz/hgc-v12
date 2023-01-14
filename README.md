# hans.gerwitz.com

[![Netlify Status](https://api.netlify.com/api/v1/badges/5c7e6706-a749-45da-b3ef-f8b74826d030/deploy-status)](https://app.netlify.com/sites/hgc-v12/deploys)

## Building

Source files are in `/src` and site is built to `/_site`.

To set up, from the root directory: `npm run build`
To test: `npm run start`

## Standards

Javascript is 100% optional. CSS is also optional, but without it everything will be ugly.

Navigation and URL structure match as closely as is reasonable.

"Static page" URLs are "pretty" and end with `/`.

"Dated content" source files (e.g. posts and notes) are named `{iso-date}-{slug}.html`. Organization into folders such as years is arbitrary and only for ease management. Their URLs are rendered old-school-blog style as `/YYYY/MM/DD/slug.html` because many of them are old and [cool URLs don't change](https://www.w3.org/Provider/Style/URI.html).

If they do, a 301 redirect is put in place at the old URL.

Quotes are rendered by [markdown-it-attribution](https://github.com/dweidner/markdown-it-attribution) which renders HTML as `<figure>` elements, à la [ALA](https://alistapart.com/blog/post/more-thoughts-about-blockquotes-than-are-strictly-required/).

## Content

`/weeks` contains journal entries that will be included in the weekly archive URLs.

`/writing` contains **posts** that include a title and publication date. They are published to dated URLs. Often they are PESOS (manually).

`/notes` contains short **notes** that are identified primarily by publication time. They are published to dated URLs. They are generally tweet-length, but there is no formal limits on their content. They are usually posted via Sitewriter. They are POSSE to Micro.blog and Twitter (via an RSS feed).

`/media` contains attachments to dated content (posts and notes), often uploaded via Sitewriter.

Almost everything else is a **page** meant to be permanent and fit within some sort of topic hierarchy.

## Implementation notes

Inspired by https://jkc.codes/blog/creating-drafts-in-eleventy/ the dynamic data files in /writing and /notes cause a true `draft` value to exclude pages from collections
