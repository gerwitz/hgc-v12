---
title: Pushy, pushy
categories:
- work
writing-tags:
- technology
- web
- fave
---

![midvale](/assets/2004-10-27-pushy-pushy/midvale.jpg)

While there are wonderful [efforts afoot to improve the efficiency of RSS][2], I've seen a lot of discussion lately about how the polling model RSS is based on is doomed to collapse under its own weight.  Increasingly, I run across predictions that the pull model of syndication will inevitably be replaced by a more scalable push.

   [2]: http://bobwyman.pubsub.com/main/2004/09/using_rfc3229_w.html

First, I'd like to note that "no one will be able to scale this model because it is inherently broken" is not a position that's often been proven correct by history.  Furthermore, a flavor of this particular prediction has been [made before][3] and [failed][4].  I was a skeptic then (I remember feeling anxiety that I must be missing something, because I never understood what value PointCast provided beyond a mildly interesting screensaver) and am a skeptic now.

   [3]: http://www.wired.com/wired/archive/5.03/
   [4]: http://www.fool.com/EveningNews/foth/1999/foth990707.htm

A push model for content syndication requires that clients listen for events.  Anyone who's built an event-driven distributed system can tell you about the fun to be had dealing with missed messages.  A push client request a "messages you missed" list when it registered as a listener, otherwise my Powerbook would never learn about entries posted while it was asleep.  The push server would need to queue messages for registered clients and try sending again after some arbitrary interval.  Or the client might occasionally send a heartbeat and confirm that its content is up-to-date, but that sounds a lot more like pull than push, doesn't it?

In short, pure push only works for always-connected clients, and the simplest case requires quite a bit more server intelligence than "respond to GET with this XML file."  The pull model is largely responsible for the success of the web, and infrastructure (NAT routers, firewalls) have evolved around it.  Attempts to syndicate web content with a broadcast metaphor are misguided.
