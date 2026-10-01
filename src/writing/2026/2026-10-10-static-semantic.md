---
title: Semantic search without runtime semantics
categories:
- work
topics:
- search
- ai
- web
draft: true
---

## The goal

- Improve discovery when a query and a page use different vocabulary.
- Keep the website static.
- Do not download an embedding model to the browser.
- Do not send visitors’ queries to an API.
- Keep runtime search small, conventional, and self-hosted.

## The constraint

- True vector search needs an embedding for both the document and the query.
- Generating a query embedding requires either a server or a browser model.
- Move the semantic work to the build instead.

## Step 1: define one content inventory

- Start with the static-site generator’s searchable collection.
- Keep title, URL, description, date, type, categories, and explicit topics in one canonical record.
- Render Markdown bodies with the same Markdown renderer used by the site.
- For generated or templated pages, index metadata only rather than template source.
- Feed embedding generation, related-content calculation, and the search index from these records.

## Step 2: cache document embeddings

- Generate embeddings during an explicit content-maintenance task, not during normal deployment.
- Address each embedding by a hash of its normalized text rather than its URL.
- Reuse the vector when a page moves or presentation metadata changes.
- Keep separate hashes for text, relationships, and presentation.
- Commit the cache so deployment builds make no API requests.

## Step 3: combine similarity with explicit topics

- Calculate cosine similarity between document embeddings.
- Treat topics as an independent editorial signal rather than embedding input.
- Give uncommon shared topics more weight than broad, common topics.
- Require a minimum semantic score so a shared topic cannot conceal unrelated prose.
- Retain the semantic, topic, and combined scores for diagnosis.

## Step 4: maintain an incremental relationship graph

- Compare a new or changed page with the existing corpus.
- Recalculate pages affected by changed topic frequencies.
- Retain more candidates than are publicly displayed.
- Publish only strong relationships selected by both pages.
- Use the candidate reserve to handle most additions and deletions without rebuilding every pair.

## Step 5: turn relationships into search vocabulary

- Build an ordinary Pagefind index.
- Give titles and explicit topics strong weights.
- Add titles and topics from a few high-confidence related pages as low-weight metadata.
- Keep inferred vocabulary out of visible content and search excerpts.
- Let Pagefind perform lexical lookup in the browser; do not ship vectors.

## Step 6: build useful previews

- Use Pagefind’s query-specific excerpt for Markdown pages.
- Because the Markdown was rendered before indexing, excerpts contain prose and link labels rather than raw syntax or URLs.
- Use the normal description for metadata-only generated pages.
- Present both with the site’s existing large content-preview component.

## What this does not do

- It is not query-to-document vector search.
- It cannot understand vocabulary that appears nowhere in the site or its metadata.
- Related-page vocabulary can broaden discovery, but should be tightly limited to avoid semantic drift.

## What visitors receive

- A self-hosted Pagefind runtime.
- Precompiled, cacheable index fragments fetched as needed.
- No AI model.
- No vectors.
- No third-party query request.
