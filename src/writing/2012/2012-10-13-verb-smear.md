---
title: Verb Smear
abstract: Which user was that?
categories:
- work
content-tags:
- design
- ui
---

I'm still catching up on the presentations from UIST 2012, but the [capacitive fingerprinting][disney] has caught my attention.

[disney]: http://www.newscientist.com/blogs/onepercent/2012/10/a-touchscreen-that-knows-how-y.html

As touch becomes a dominate interaction modality and large surfaces gain interactive features, multi-user scenarios must emerge. [wallFour][] is leading the way with experiences that engage dozens of participants, by cleverly accomodating the confusion of many pointers.

[wallFour]: http://wallfour.co.uk/

But as we discovered at frog with a giant touchscreen we built in 2009[^llp] for experimentation, multiuser applications often run into difficulties discerning intention. Our dependance on modes in modern GUI is quickly apparent when more than one user is interacting and you cannot discern which user-selected modes apply to an action. We used a simplistic example of area selection--how can we independently choose a number of objects from a shared pool?

[^llp]: engineered primarily by [Jose](http://twitter.com/joseh/) using [LLP](http://sethsandler.com/multitouch/llp/)

First considered was a Jef Raskin-approved modeless approach that gave us each a selection bucket, which we drag our selected object to. But this is tedious on a personal screen and fatiguing on a large one. Worse, by monopolizing individual "nouns" to drag them to our personal "verb", we change the landscape for the other user. This might be fun for a competitive game, but is cognitively inefficient for cooperation. It was clear we needed to lead with verb selection.

Numerous verb approaches were spawned from gedankenexperiment, most involving unique gestures (e.g. I tap with two fingers, you use three) or lassos. I combined these for "action ink": a user-specific gesture brings up a palette of verbs (like a [pie menu][]) which can be spread to touch or encompass objects. This might be described as using continuous touch to enable [quasimodes][]. This was flexible and worked well, but unconventional enough to require an uncomfortable amount of user training.

[pie menu]: http://en.wikipedia.org/wiki/Pie_menu
[quasimodes]: http://books.google.com/books?id=D39vjmLfO3kC&pg=PA55&ots=CPrzc33RVa

So methods to uniquely identify touches by person remain the holy grail of these experiences, and it's exciting to see Disney finding some success with an approach that does not require augmentation with gloves or styluses.
