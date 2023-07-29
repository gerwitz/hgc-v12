---
title: Site Design
layout: page
---

After too many revisions over so many years, I’m aiming for timeless and true to the medium. The site map is purposefully simple and user-visible navigation references the URL structure, and I make an effort to avoid upsetting changing them.[^tim] This relationship is reinforced by rendering internal links as path fragments, as in the footer. The minimal branding with most wayfinding pushed to the footer was inspired by [Simon Sigurdhsson's blog](https://blog.sigurdhsson.org/) long ago.

[^tim]: For [Tim Berners-Lee's sake](https://www.w3.org/Provider/Style/URI).

Content layout was originally inspired by [Tufte CSS](https://edwardtufte.github.io/tufte-css/). A key feature is the use of sidenotes, which are difficult in CSS. I settled on a simple floats approach similar to [practicaltypography.com](https://practicaltypography.com/page-margins.html) with `<aside>` markup inspired by [Ink and Switch](https://www.inkandswitch.com/capstone/). Using a [tweaked plugin for markdown-it](https://github.com/uyumyuuy/markdown-it-footnote-here), this is done with standard Markdown and results in semantic HTML.

Body copy is set in [STIX Two](https://www.stixfonts.org/), a modernization of Donald Knuth's original Computer Modern. Other type is using [Source Sans](https://github.com/adobe-fonts/source-sans/), designed by [Paul D. Hunt](https://www.p22.com/designers_view-Paul_D__Hunt) for Adobe. Both are used under the SIL Open Font License v1.1.

The logo glyph[^logo] is [LEGO part #2435][tree]. As a child I was fascinated with the [larger version][big tree] of this part as a manufactured object. I also spent a lot of time in forests and many of my friends were trees. (I previously used the [Unicode tree glyph][unicode], <span role="img" aria-label="tree">&#x1F332;&#xFE0E;</span> but this simple dingbat has been lost to creeping emojification.)

[tree]: https://www.bricklink.com/v2/catalog/catalogitem.page?P=2435
[big tree]: https://www.bricklink.com/v2/catalog/catalogitem.page?P=3471
[unicode]: https://unicode-table.com/en/1F332/

[^logo]: {% tree 99 %}

## What to call this style

It wouldn’t be quite right to call it brutalism, because the modernists were reacting against nostalgia and, to be honest, there is a lot of nostalgia for an earlier internet in my motivation. Moreover, the word has been [embarassingly misappropriated](http://www.brutalistwebdesign.com/) by the web design community, though [David Copeland gets it](https://brutalist-web.design/).

I certainly like to [flatter myself with references to the Bauhaus](https://hans.gerwitz.com/2018/06/07/the-artificial-genesis.html#digital-design-needs-a-bauhaus) implying analogies between HTML and plywood. But I don’t think it appropriate to use the name of that school for a mere style. Even if it were, the aesthetics of those practitioners generally included more whimsy than I’m expressing here.

So it shall go nameless.
