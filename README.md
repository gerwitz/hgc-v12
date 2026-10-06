# hans.gerwitz.com

![production timestamp badge](https://hans.gerwitz.com/.well-known/calmserve/updated.svg)

This is an [Eleventy](https://www.11ty.dev/) project that builds https://hans.gerwitz.com/

The repository is a mix of site-building code, which may be authored with AI, and content, which is human-crafted.

Most page content is in markdown parsed by [markdown-it](https://github.com/markdown-it/markdown-it), layout templates and more complex pages use [Nunjucks](https://mozilla.github.io/nunjucks/).

## Building

Source files are in `/src` and site is built to `/_site` for deployment.

To set up, from the root directory: `npm run build`
To start a test server: `npm run start`

`npm run build` renders the site once, then creates the Pagefind search index using the same canonical content records used by related-content generation. A successful full Eleventy build writes those records to the ignored, private `.cache/content-records.json` artifact, outside the deployed `_site` directory. `npm run search:index` can rebuild the index from that artifact without rendering the site again; after source changes, run a full build first. Failed or incremental filesystem builds invalidate the artifact rather than leaving stale or partial records available.

Some expensive generated assets are committed to the repository so deployment builds do not need to recreate them. Before committing changes that affect travel maps, run:

`npm run generate:maps`

This writes generated SVG map fragments to `src/_generated/maps/`. The normal Eleventy build reads those files and inlines them into pages. If a required map asset is missing, the build will generate it and print a warning, but that fallback is slower and should not be relied on for deployment.

For local development, requests under `/media/*` can be redirected to the production media bucket by setting `MEDIA_ORIGIN` before starting Eleventy. For example:

`MEDIA_ORIGIN=https://your-media-host.example npm run start`

This keeps content URLs site-relative, such as `/media/example.jpg`, while loading media from the bucket during local development. The `/media/` prefix is removed when redirecting, so `/media/example.jpg` redirects to `https://your-media-host.example/example.jpg`.

### Related content

Related-content data and its OpenAI embedding cache are committed so normal and deployment builds do not make API requests. To refresh them after changing searchable content, run:

`OPENAI_API_KEY=... npm run related`

Related-content commands always extract fresh records from the current sources, rather than trusting the previous build artifact. Search and related-content generation share content selection, text extraction, and metadata; search also uses high-confidence related titles and topics as neighbor vocabulary. Published `gemposts` join both corpora with canonical `gemini://hans.gerwitz.com/gemlog/…gmi` destinations, while drafts remain excluded and no web counterparts are generated. Search results and related links to these posts use the `gemini-link` class with a prefixed Gemini symbol; following them requires a Gemini protocol handler. Refresh the embedding data with `npm run related` after adding gemposts, then rebuild the site to publish their relationships.

Use `npm run related:check` to list the eligible content without requesting embeddings. The generator writes `generated/related-content-cache.json`, `generated/related-graph-cache.json`, and `src/_data/related.json`; commit these files with the related content changes.

## Deployment (Coolify)

This project is configured for Dockerfile-based deployment in Coolify.

- Build source: `Dockerfile`
- Runtime base image: `ghcr.io/gerwitz/calmserve`
- Runtime servers: Nginx, Gemini, and Spartan
- Generated site path: `/_site` copied to `/usr/share/nginx/html`
- Generated Gemini path: `/_site/editions/gemini` copied to `/srv/calmserve`

Media requests under `/media/*` are proxied by Nginx to an S3-compatible origin, using the `MEDIA_ORIGIN_HOST` environment variable.

Set this in Coolify application environment variables, for example:

`MEDIA_ORIGIN_HOST=your-bucket.s3.fr-par.scw.cloud`

With this configuration, browser URLs remain same-origin (for example `/media/example.jpg`) while content is fetched from the object storage backend.

The same media origin is used by the Gemini and Spartan service. Expose container
port `1965` for Gemini and map the public Spartan port `300` to container port
`3000`.

In the Coolify application's persistent storage settings, add a volume mounted
at `/var/lib/calmserve/certificates` before deploying. The Dockerfile cannot
configure Coolify's persistent storage; a Dockerfile `VOLUME` declaration alone
does not ensure the same volume is reused across deployments. Keep this mount
attached to the application so `cert.pem` and `key.pem` survive container
replacement. Gemini clients trust the self-signed certificate across visits, so
losing these files causes certificate warnings. If the previous certificate and
key are available, restore both to the volume to retain existing client trust;
otherwise clients must accept the new certificate once.

The `calmserve` image is maintained in the
[`gerwitz/calmserve`](https://github.com/gerwitz/calmserve) repository. It must be
publicly readable in GitHub Container Registry, or Coolify must be configured
with registry credentials. The site Docker build accepts `CALMSERVE_IMAGE` as a
build argument when a specific image tag or digest should be used instead of
`latest`.

### Gemini notifications when the container becomes ready

Maintain notification URLs in `src/_editions/gemini/pings.json`, beside the
redirect generator. It is a JSON array of full `gemini://` URLs; an empty array
disables notifications. The file is copied to `/opt/gemini-ping/pings.json`, not
into the publicly served site or capsule. Avoid committing secret tokens.

No Coolify deployment command or enabling environment variable is needed. On
container startup, `scripts/start-site.sh` launches a one-shot background
notifier and then executes Calmserve's existing startup script under tini. The
notifier waits for HTTP, Gemini, and Spartan health checks to pass before running
the ping client. It makes up to 30 local readiness checks, two seconds apart;
notifications never block startup or interrupt the servers.

Output appears in the container's normal logs. Image builds, local npm builds,
and recurring Docker health checks do not send notifications. Remove any
previous Coolify post-deployment ping command to avoid invoking the client twice.

Before notifying endpoints, the client fetches
`gemini://hans.gerwitz.com/gemlog/` and compares its body byte-for-byte with
`/srv/calmserve/gemlog/index.gmi`. It sends no notifications while the public
capsule is unavailable or still serving a different feed. Override
`GEMINI_PING_READY_URL` and `GEMINI_PING_READY_FILE` together if needed.

Requests use TLS without certificate verification, accept Gemini 2x responses,
and follow at most three Gemini redirects. Requests have a five-second timeout;
network errors, temporary 4x responses, and stale readiness content get up to two
retries one second apart. Endpoint failures and configuration errors are logged
without affecting the running servers. Notifications are best-effort and retries
can repeat a request.

This is a container-readiness trigger, not a deployment-platform completion
hook. Restarts also attempt notification. A development or preview container
with the same feed as production can notify as well: the public-content check
confirms content availability, not deployment identity. An empty endpoint list
is the off switch. If the feed is unchanged, the readiness comparison cannot
distinguish old and new containers, but the advertised content is already live.

Validate configuration locally without making requests:

```sh
npm run gemini:ping -- --dry-run
```

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

`/gemposts` contains titled **capsule posts**, published only in Gemini. Author them in `src/gemposts/YYYY-MM-DD-slug.md` with a `title`, an optional explicit `date` (otherwise inferred from the filename), and a Markdown body. They join writing in `collections.gemlog`; the existing web `collections.posts` is unchanged.

The capsule publishes both writing and gemposts at `/gemlog/YYYY-MM-DD-slug.gmi`. `/gemlog/` lists the newest 50, and `/gemlog/archive/` is the complete archive. The build generates `editions/gemini/redirects.json` to redirect former `/posts/` and Gemini writing URLs. Deploy a rebuilt `calmserve` image with redirect-map support before deploying this URL change.

`/notes` contains short **notes** that are identified primarily by publication time. They are published to dated URLs. They are generally tweet-length, but there is no formal limits on their content. They are usually posted via [IndieKit](https://getindiekit.com). They are POSSE to Micro.blog and Twitter (via an RSS feed).

`/media` contains attachments to dated content (posts and notes), often uploaded via IndieKit.

Almost everything else is a **page** meant to be permanent and fit within some sort of topic hierarchy.

## Implementation notes

Inspired by https://jkc.codes/blog/creating-drafts-in-eleventy/ the dynamic data files in /writing and /notes cause a true `draft` value to exclude pages from collections (`defined in index.js`).
