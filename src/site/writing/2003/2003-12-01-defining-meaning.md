---
title: Defining meaning
categories:
- uncategorized
content-tags:
- tagless
---

After my pondering on [preserving context][1] when describing document formats with semantic metadata, [Paul Brown][2] pointed me to the [Charteris
Integration Toolkit][3].  Their marketing literature defines the costs of data integration in 8 points, which I would simplify into two categories: point-to-point scaling problems, including _n_(_n_-1) complexity, and semantic context.  The former is handily solved by a [canonical data model][4], but they point out that many field-to-field mapping tools fall short in considering context.

   [1]: http://phobia.com/C1831483079/E973137839/
   [2]: http://blog.fivesight.com/prb/
   [3]: http://www.charteris.com/XMLToolkit/
   [4]: http://www.enterpriseintegrationpatterns.com/CanonicalDataModel.html

[Robert Worden][5]'s answer to persisting semantic context this is the [Meaning Definition Language][6].  Unfortunately, Charteris seems to have decided that it is in their best interest to keep it wrapped up with their product, so the only reference I can find (without asking the [Internet
Archive][7]) is an [introductory paper][8].  Still, MDL looks like a great start, and is more mature than my "XPath field definition" and "add metadata to XSD" approaches.

   [5]: http://dspace.dial.pipex.com/jcollie/biograph.htm
   [6]: http://xml.coverpages.org/ni2001-08-22-b.html
   [7]: http://archive.org/
   [8]: http://xml.coverpages.org/MDLWhitePaper.pdf

Upcontent about MDL][9].  Good stuff.

   [9]: http://www.charteris.com/XMLToolkit/MDL.asp
