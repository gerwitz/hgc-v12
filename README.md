# hans.gerwitz.com

This is an [Eleventy](https://www.11ty.dev/) project that builds https://hans.gerwitz.com/

Most page content is in markdown parsed by [markdown-it](https://github.com/markdown-it/markdown-it), layout templates and more complex pages use [Nunjucks](https://mozilla.github.io/nunjucks/).

## Building

Source files are in `/src` and site is built to `/_site` for deployment.

To set up, from the root directory: `npm run build`
To start a test server: `npm run start`

For local development, requests under `/media/*` can be redirected to the production media bucket by setting `MEDIA_ORIGIN` before starting Eleventy. For example:

`MEDIA_ORIGIN=https://your-media-host.example npm run start`

This keeps content URLs site-relative, such as `/media/example.jpg`, while loading media from the bucket during local development. The `/media/` prefix is removed when redirecting, so `/media/example.jpg` redirects to `https://your-media-host.example/example.jpg`.

## Deployment (Coolify)

This project is configured for Dockerfile-based deployment in Coolify.

- Build source: `Dockerfile`
- Runtime server: Nginx
- Generated site path: `/_site` copied to `/usr/share/nginx/html`

Media requests under `/media/*` are proxied by Nginx to an S3-compatible origin, using the `MEDIA_ORIGIN_HOST` environment variable.

Set this in Coolify application environment variables, for example:

`MEDIA_ORIGIN_HOST=your-bucket.s3.fr-par.scw.cloud`

With this configuration, browser URLs remain same-origin (for example `/media/example.jpg`) while content is fetched from the object storage backend.

## Standards

Javascript is 100% optional. CSS is also optional, but without it everything will be ugly.

Navigation and URL structure match as closely as is reasonable.

"Static page" URLs are "pretty" and end with `/`.

"Dated content" source files (e.g. posts and notes) are named `{iso-date}-{slug}.md`. Organization into folders such as years is arbitrary and only for ease management.

If they do, a 301 redirect is put in place at the old URL.

Quotes are rendered by [markdown-it-attribution](https://github.com/dweidner/markdown-it-attribution) which renders HTML as `<figure>` elements, à la [ALA](https://alistapart.com/blog/post/more-thoughts-about-blockquotes-than-are-strictly-required/).

## Content

`/weeks` contains journal entries that will be included in the weekly archive URLs.

`/writing` contains **posts** that include a title and publication date. They are published to dated URLs. Often they are PESOS (manually).

`/notes` contains short **notes** that are identified primarily by publication time. They are published to dated URLs. They are generally tweet-length, but there is no formal limits on their content. They are usually posted via [IndieKit](https://getindiekit.com). They are POSSE to Micro.blog and Twitter (via an RSS feed).

`/media` contains attachments to dated content (posts and notes), often uploaded via IndieKit.

Almost everything else is a **page** meant to be permanent and fit within some sort of topic hierarchy.

## Implementation notes

Inspired by https://jkc.codes/blog/creating-drafts-in-eleventy/ the dynamic data files in /writing and /notes cause a true `draft` value to exclude pages from collections (`defined in index.js`).
