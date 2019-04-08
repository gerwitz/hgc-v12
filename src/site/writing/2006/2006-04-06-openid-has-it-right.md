---
title: OpenID has it right
categories:
- uncategorized
writing-tags:
- tagless
---

There has been much ado over the last year about identity.  Most of the early plays were centralized thinly-veiled attempts to [own your identity][1].  Even many of the [2.0][2] systems depend on the solvency of a managing organization.  SAML is a big heavy beast as you might expect from a [committee][3].

So, I was very excited in January of 2005 to see [LID][4].  I set out to make my site compliant.  I started by writing a server, as I needed a LID URL for testing.  It quickly became apparent, though, that reusing an already-dynamic URL would require I modify existing request-handling code.  At that time, I was using [SnipSnap][5] and the project was dormant and not very extensible, so sharing my work would require forking the codebase.

It is ridiculous, I concluded, that I should even have such a dilemma, why can't I just reference the LID server URL from my published, friendly one?  So I queried [Johannes Ernst][6]: 

   [1]: http://en.wikipedia.org/wiki/Microsoft_Passport
   [2]: http://www.sxip.com/
   [3]: http://www.projectliberty.org/membership/current_members.php
   [4]: http://lid.netmesh.org/
   [5]: http://www.snipsnap.org/
   [6]: http://netmesh.info/jernst

> I find it a bit unwieldy to have the LID server acting as a filter for a URL otherwise served by other applications.  I would like to understand why the spec doesn't either postfix the URL (e.g. "http://www.example.com/~me/lid/") or always begin the querystring with a parameter that can be used for filtering (e.g. ?lid&help=help").  (I don't want to simply use http://phobia.com/lid/, as I think the re-use of web URLs is an appealing attribute of LID.)

 He responded by pointing me to a [rationalization of using your "real" URL][7] which didn't really answer my question, ignored my acknowledgement of same, and made it clear he just didn't see why I might be annoyed that his spec basically asserts "we hereby claim a set of querystring parameters in the name of NetMesh!"

So, I just lost interest and decided to give the market more time to find a solution.  A year later, and along comes [OpenID][8], which has this to say about LID: 

   [7]: http://netmesh.info/jernst/Digital_Identity/dave-kearns-question.html
   [8]: http://openid.net/

> Assumes that identity URLs are dynamic documents that can handle fancy URL parameters. Not true in real life, which is key for adoption.

Amen, brother.  The tremendous [interest][9] a decoupled approach has garnered has even convinced Johannes that even OpenID isn't abstract enough, and we really need [more redirection][10] so everyone can still have their favorite spec.  Whatever.  I'll be looking to comply with OpenID soon.

   [9]: http://www.technorati.com/chart/openid
   [10]: http://yadis.org/
