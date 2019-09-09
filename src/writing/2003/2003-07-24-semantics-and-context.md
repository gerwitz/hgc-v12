---
title: Semantics and context
categories:
- work
content-tags:
- semantic
- data
- web
- fave
---

[Burningbird has chosen sides][1] in the scientist vs. poet debates of [WWW-TAG][2].

   [1]: http://weblog.burningbird.net/fires/001373.htm
   [2]: http://www.w3.org/2001/tag/

Although I pride myself for not falling prey to the geek mind-candy that everything can be reduced to bits, I feel the need to defend the scientist, here.

By asserting that a URI **identifies** a thing, Tim Berners-Lee is not throwing away context entirely!

TimBL would say that URI(Shelley) denotes Shelley Powers.  This Shelley Powers, not any other that might have the same spoken language name.  Here there is, indeed, no room for context.  If I say "Shelley Powers" here, context reduces ambiguity to nil, if I say "Shelley Powers" to a random bloke on the streets of Sydney, he could very well assume I mean his pilates instructor.  What I mean by this noun needs to be unambiguous for the Semantic Web to be useful to software.

I have not heard/read anything from TimBL that denies the use of context for the statements made with these nouns, however.  I may create a FOAF file that says I "know" Shelley.  URI(Shelley) makes it unambiguous whom I mean.  URI(foaf:know) makes it unambiguous that I am stating knowledge of her.  A Semantic Web client, though, cannot be expected to believe everything it reads!

The context of "A FOAF file published by Hans" is important and recognized by the scientists (those who want to author the Semantic Web for a software audience).  Any decision made on the premise "Hans knows Shelley" should require additional context.  In this case, that URL(Hans) be connected by URL(foaf:know) to URL(Shelley) in a FOAF certified by Shelley (Shelley says "Hans knows me."  This backlinking is not a feature of FOAF as far as I know).  None of the word-meanings in these sentences are ambiguous, but the context of such **assertions** will always leave room for some [poetic engineering][3].

   [3]: http://www.knowledgesearch.org/lsi/structured_data.htm
