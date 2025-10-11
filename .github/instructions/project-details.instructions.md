---
description: Project-specific instructions for hans.gerwitz.com
applyTo: "**"
---

## Project Overview

**hans.gerwitz.com** is a personal website for Hans Gerwitz, built with Eleventy (v3) and deployed via Coolify.

- Production: `hans.gerwitz.com`
- Static site generated from Nunjucks templates and Markdown

## Site Structure

Content source files are in `/src/` and the site is built to `/_site/` for deployment. Most configuration is in `/eleventy/`.

### Content Types

The site is primarily an archive of written content, and some information about the author.

`/weeks` contains journal entries that will be included in the weekly archive URLs.

`/writing` contains **posts** that include a title and publication date. They are published to dated URLs. Often they are PESOS (manually).

`/notes` contains short **notes** that are identified primarily by publication time. They are published to dated URLs. They are generally tweet-length, but there is no formal limits on their content. They are usually posted via [IndieKit](https://getindiekit.com). They are POSSE to Micro.blog and Twitter (via an RSS feed).

`/media` contains attachments to dated content (posts and notes), often uploaded via IndieKit.

`/logs` contains various collections of timelines, some with detailed pages for individual entries.

Almost everything else is a **page** meant to be permanent and fit within some sort of topic hierarchy.

## Development Workflow

### Running Locally

```bash
npm install          # Install dependencies
npm start            # Build, serve, and watch (port 8000)
npm run build        # Build once
```
## Eleventy Configuration

- Markdown rendered with markdown-it, typographer enabled (smart quotes)
- Nunjucks configured with `lstripBlocks` and `trimBlocks`
- Custom Nunjucks environment loads GOV.UK Frontend components
- Filters and collections auto-imported from their directories
- HTML minification in production only
