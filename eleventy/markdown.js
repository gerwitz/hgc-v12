import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import markdownItAttribution from "markdown-it-attribution";
import markdownItDeflist from "markdown-it-deflist";
import markdownItFootnote from "markdown-it-footnote-here";
import markdownItImplicitFigures from "markdown-it-implicit-figures";
import markdownItLinkAttributes from "markdown-it-link-attributes";

const linkAttributeConfigs = [
  {
    matcher(href) {
      return href.match(/^https?:\/\//);
    },
    attrs: {
      class: "external",
    },
  },
  {
    matcher(href) {
      return href.match(/^[./](.*)$/);
    },
    attrs: {
      class: "internal",
    },
  },
  {
    matcher(href) {
      return href.match(/^[./](.*)\/$/);
    },
    attrs: {
      class: "index",
    },
  },
];

export default function markdownPlugin(eleventyConfig) {
  const options = {
    html: true,
    linkify: true,
    typographer: true,
    quotes: "“”‘’",
  };

  const markdownLib = markdownIt(options)
    .use(markdownItFootnote)
    .use(markdownItAttribution, {
      classNameContainer: "quotation",
      classNameAttribution: "",
      marker: "--",
      removeMarker: true,
    })
    .use(markdownItImplicitFigures, {
      dataType: true,
      figcaption: true,
    })
    .use(markdownItAnchor)
    .use(markdownItDeflist)
    .use(markdownItLinkAttributes, linkAttributeConfigs)
    .disable(["lheading"]);

  markdownLib.renderer.rules.footnote_ref = function renderFootnoteRef(tokens, idx, opts, env, self) {
    const id = self.rules.footnote_anchor_name(tokens, idx, opts, env, self);
    return `<label for="fn:${id}" id="fnref:${id}"><a href="#fn:${id}" rel="footnote" role="doc-noteref" aria-describedby="fn:${id}" class="sidenote-ref">${id}</a></label>`;
  };

  markdownLib.renderer.rules.footnote_block_open = () => "<!-- footnote open -->";
  markdownLib.renderer.rules.footnote_block_close = () => "<!-- footnote close -->";

  markdownLib.renderer.rules.footnote_open = function renderFootnote(tokens, idx, opts, env, self) {
    const id = self.rules.footnote_anchor_name(tokens, idx, opts, env, self);
    return `<aside id="fn:${id}" class="sidenote" form-associated="true"><span class="sidenote-ref">${id}</span>`;
  };

  markdownLib.renderer.rules.footnote_close = () => "</aside>";
  markdownLib.linkify.set({ fuzzyLink: false });

  eleventyConfig.setLibrary("md", markdownLib);
}
