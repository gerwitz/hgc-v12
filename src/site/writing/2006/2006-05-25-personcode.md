---
title: PersonCode
categories:
- work
writing-tags:
- technology
- web
---

A few years ago I was musing about the need to "tag" online resources with personal identifiers more secure than email addresses and less exclusive than URLs, and thought it might be nice to encourage the use of mailto: URI hashes as in the [FOAF spec][1] as "secure enough" personal identifiers.  "foaf:mbox_sha1sum" doesn't exactly roll off the tongue, so I coined the term "PersonCode" and went so far as to register personcode.com, hoping to build an identity aggregator that would freely integrate and let the user own their own data (a seemingly novel approach in 2002).

Of course, I've never finished baking that idea, and have always assumed we'd see something like that take off, with [Anil being excited about FOAF][2] and all.  Since then everyone's gotten all 2.0 and understands that users want to own their own content and playing nice with other services brings ecosystem benefits, but we still end up kludging together identity with manual aggregators like [SuprGlu][3] and have great standards for [Identity 2.0][4] with no real adoption because they're solving hard problems that require nonzero effort for user adoption.

[MicroID][5] is great for verifying ownership, but not for discovery or mash-ups.  [Gravatar][6]'s MD5 hashed email address is the closest I've found in the wild to a PersonCode (as a content-generating user, I don't have to do anything but provide my already-required email address), but that's a very specialized niche.

What I want can be described by a simple scenario: I enable "publish my PersonCode" on my [plazes profile][7].  Later, I login to [Yelp][8], who knows my email address, and they make a request to plazes asking for the location of PersonCode 1e2998da88a2c4fe1eef13c013bffbf3bca2c3a8.  If plazes had never met me, they wouldn't have learned a new email address; however, since they have they can respond and Yelp can use the answer to offer a "near here" search option.

So, there's still a need without a killer app.  Maybe we can talk Jeremie into marking the publication URI on MicroID optional and supporting its use in this manner, although that's arguably a dilution that would complicate implementation of its core intent.

I'd also love to see tagging standards for RSS/Atom, and a place for it in [hCard][9] so it could be used within [hAtom's author field][10].

(Credit to Morten Frederiksen's [sha1ify][11] for generating my PersonCode.)

   [1]: http://xmlns.com/foaf/0.1/#term_mbox_sha1sum
   [2]: http://www.sixapart.com/about/news/2004/01/format_offering.html
   [3]: http://www.suprglu.com/
   [4]: /2006/04/06/openid-has-it-right.html
   [5]: http://microid.org/
   [6]: http://www.gravatar.com/
   [7]: http://www.plazes.com/whereis/phobia/
   [8]: http://gerwitz.yelp.com/
   [9]: http://microformats.org/wiki/hcard
   [10]: http://microformats.org/wiki/hatom#Entry_Author
   [11]: http://xml.mfd-consult.dk/foaf/sha1ify/
