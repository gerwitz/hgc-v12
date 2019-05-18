---
title: Feature logjam
categories:
- uncategorized
content-tags:
- tagless
---

Recently, we've been encountering an [antipattern][1] I'll call feature logjam (Scott Johnson calls it [too many
chestnuts][2]).

   [1]: http://www.antipatterns.com/
   [2]: http://feedster.com/blog/archives/264_Why_No_New_Features__Im_Not_Responding_to_Email_and_IM.html

Coordination of multiple offshore development teams has taught us not to issue lists of tasks longer than absolutely necessary.  Every one of them will tackle tasks by technical challenge or perception of project scope, overlooking the guidance of our project managers and architects.

This antipattern isn't unique to offshore work, though, we've seen varieties of it everywhere.  I've had to work with otherwise proficient developers that needed to be dealt one task at a time or they'd get stuck in the tar pits.

One client who has previously led a small development team with a 20 year old code base evolved a micro-release strategy.  They constrict releases to one major feature or fix.  He wouldn't even discuss the details of a potential feature until the present release was complete.
