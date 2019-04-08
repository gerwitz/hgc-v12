---
title: Facebook Yelps
categories:
- work
writing-tags:
- business
- technology
- marketing
- web
---

[Facebook's new advertising model][1] includes publication of activity from partner sites in news feeds.  Their [official list of affiliates][2] does not include [Yelp][3], but tonight, I had a little DHTML "toast" pop-up inform me my latest review would be shared on my Facebook profile.

A little investigating shows that this was pulled off via a JavaScript include, http://www.facebook.com/beacon/beacon.js.php and there's already a bit of [kerfuffle][4] about it.

It does appear that authentication is being handled entirely via facebook.com cookies, and participating in this integration requires they recognize your site as a registered source.

   [1]: http://blog.facebook.com/blog.php?post=6972252130
   [2]: http://www.facebook.com/help.php?page=57
   [3]: http://gerwitz.yelp.com/
   [4]: http://alexander.kirk.at/2007/11/16/facebook-discloses-its-users-to-3rd-party-web-sites/
