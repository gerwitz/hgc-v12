---
title: Metadata context
categories:
- uncategorized
content-tags:
- tagless
---

I've been participating in an [industry
association][1] committee that is evaluating data exchange standards.  Part of this process is mapping representative documents to potential standards (this week, [OAGIS][2] and [UDEF][3]).  Naturally, this is being done by filling in an existing Excel worksheet with a row for each data element.

   [1]: http://www.aia-aerospace.org/
   [2]: http://www.openapplications.org/
   [3]: http://www.udef.org/

This works out well for the need being addressed; the data is structured in simple hierarchies that recur across documents, thanks largely to the influence of one particularly large [industry
customer][4].

   [4]: http://www.dod.mil/

I wonder, though, how to best represent these maps for the purposes of transforming between disparate formats with wildly divergent structure.  Context will be critical, "name and mailing address state" aren't enough, neither is "name and mailing address state of the shipping party."  To completely describe semantics, we'll need to describe "name of the shipping party of an item, and mailing address state of shipping location of same item" in an example structure.  That might be mapped to "name and mailing address state of the party labeled as shipper for the transaction that includes the item" in a second structure.

Users will drive a need for a way to consistently describe format maps, as integration initiatives continue to capture a larger portion of IT budgets.  People will realize how much intellectual capital is embodied by these mappings and won't want to be tied to a translation vendor.

Perhaps a sort of XPath pairing in a Schematron-ish document, with keyword value substitution.  My example above might look like:









For business analysts to make any sense of this, we need graphical tools.  Contivo has one, middleware vendors have theirs, but I don't know of an interchangeable "document mapping" language.  Reverse-engineering generated XSLT is too unwieldy, because there are too many ways to describe location, so different tools will generate wildly different sheets for the same map.
