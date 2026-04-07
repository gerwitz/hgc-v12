# hans.gerwitz.com

Personal website for Hans Gerwitz. Built with Eleventy v4, deployed via Coolify.

## Dev commands

```
npm start       # build, serve with livereload on port 8080
npm run build   # single build to /_site
```

## Architecture

Source in `/src/`, build output in `/_site/`. Custom Eleventy configuration in `/eleventy/` as discrete plugins loaded in `.eleventy.js`:

- `eleventy/css.js` — Lightning CSS bundling with SHA256 cache-busting hashes
- `eleventy/markdown.js` — markdown-it with 6 plugins (anchor, attribution, deflist, footnote, figures, link-attributes)
- `eleventy/collections/` — auto-loaded; each file exports a named collection
- `eleventy/filters/` — auto-loaded; each file exports named filter(s)
- `eleventy/shortcodes/` — auto-loaded; each file exports named shortcode(s)

## Content types

| Type    | Source         | URL pattern         | Notes |
|---------|----------------|---------------------|-------|
| writing | /src/writing/  | /writing/YYYY/slug/ | Long-form posts, titled, PESOS |
| notes   | /src/notes/    | /notes/YYYY/slug/   | Microblog, POSSE via IndieKit |
| weeks   | /src/weeks/    | /weeks/YYYY/N/      | Weekly journal; N = weeks since genesis |
| pages   | /src/*         | mirrors directory   | Permanent pages in topic hierarchy |
| logs    | /src/logs/     | /logs/*/            | Timelines: dining, events, travel, reading |

Dated content filenames: `YYYY-MM-DD-slug.md`

Set `draft: true` in front matter to exclude content from collections.

## Week numbering

Weeks are numbered from a genesis date of 1974-03-04 (Hans's birthdate). Week 0 starts that Monday.

Core utilities in `eleventy/week.js`:
- `weekNumberFromDate(date)` — returns week number from a date
- `weekStartMoment(n)` — returns ISO start date moment for week number n
- `isoThursdayForWeek(n)` — returns the Thursday of week n (used for ISO year assignment)

## Template API (Nunjucks filters)

| Filter             | Usage                                      | Notes |
|--------------------|---------------------------------------------|-------|
| date               | `{{ d \| date('nice') }}`                   | formats: `iso8601`, `nice` (renders `<time>` element), `weekstarted` (range), or any moment.js format string |
| weeknum            | `{{ d \| weeknum }}`                        | week number from a date |
| weekstart          | `{{ n \| weekstart }}`                      | ISO start date for week number |
| weeklink           | `{{ n \| weeklink }}`                       | URL path for week |
| navpath            | `{{ page \| navpath }}`                     | breadcrumb array |
| parents            | `{{ page \| parents }}`                     | ancestor pages |
| hostname           | `{{ url \| hostname }}`                     | extracts hostname from URL |
| json               | `{{ obj \| json }}`                         | JSON.stringify |
| limit              | `{{ arr \| limit(n) }}`                     | first N items |
| cssmin             | `{{ css \| cssmin }}`                       | minify a CSS string |
| filterbycategories | `{{ posts \| filterbycategories(cats) }}`   | filter collection by category array |
| moonforweek        | `{{ weeknum \| moonforweek }}`              | emoji moon phase for week number |
| nbsp               | `{{ text \| nbsp }}`                        | non-breaking space on short words (≤12 chars, ≥2 words) |
| log                | `{{ val \| log }}`                          | debug: prints to console, passes value through |

## Template API (Nunjucks shortcodes)

| Shortcode | Usage                    | Notes |
|-----------|--------------------------|-------|
| hexmap    | `{% hexmap locations %}` | H3 hexagonal heatmap SVG via D3, server-rendered |
| map       | `{% map geojson %}`      | Geographic SVG map via D3 + Land GeoJSON, server-rendered |

All visualizations are server-side rendered via linkedom — no client-side JavaScript is emitted.

## Collections available in templates

`posts`, `weeks`, `notes`, `writing`, `content` (search index), `microblog`, `epitaphs`, `weeklyNotes`, `weeklyWriting`, `weeklyEvents`

## Coding conventions

- ES6+ modules (`"type": "module"` in package.json)
- Allman style (opening braces on own lines)
- 2-space indentation, terminating semicolons
- No trailing whitespace; blank lines have no spaces
- No client-side JavaScript unless explicitly requested
- Semantic HTML, accessible markup
- US English spelling
