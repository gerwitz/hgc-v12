---
title: "The visionOS Experience"
categories:
- work
content-tags:
- apple
- tech
external: https://www.linkedin.com/pulse/visionos-experience-hans-gerwitz-5heac
---

I previously shared my [initial impressions of the Apple Vision Pro](https://hans.gerwitz.com/2024/02/18/vision-pro.html) but recommend [Hugo Barra’s take](https://hugo.blog/2024/03/11/vision-pro/) if you’re interested in the state of the product. I don't need to add any more “it’s impressive but too heavy/expensive" takes to the world.

However! A lot of friends in design have asked me, the designated early adopter, about the HCI of Apple’s new platform. So I’ve been taking notes and now have too many words about the design of visionOS:

## Audio

One of the first things I noticed is how well integrated **audio** is. The illusion created by head tracking with AirPods Pro is beautiful with a MacBook or iPhone, but it feels essential to the sense of place in visionOS. I normally turn off every UI sound from every device I use, but don’t mind the ambient hum of the visionOS app launcher because it feels like **nature**.

(Today, in release version 1.1.1, there is still a bug where audio from Safari can remain associated when the wrong window when you detach the responsible tab. Hearing sound come from the wrong place is deeply unsettling.)

## Gestures

Many UX colleagues are curious about what I think about the pinching gestures and eye targeting. Especially those who were involved in the Microsoft Kinect-fueled “NUI” hype that had many of them expecting we’d give up _touching_ things a decade ago. I don’t have a simple answer. It’s immediately usable but takes some time to get comfortable with; it’s magical when it works but frustrating, even frightening, when it fails.

In some ways, it was easier at first, when moving my hands deliberately. Now that I’m comfortable enough to expect it to work, I sometimes pinch with my hands too far in the periphery or with my index finger occluding my thumb. I was worried the lack of tactile feedback would make this gesture feel awkward, but it’s not at all. Rather, I have trouble trusting it simply because it fails more than 1% of the time.

Interestingly, acclimating to the “indirect” pinch gesture in visionOS has made the Double Tap gesture for watchOS less comfortable for me. I now feel like I have to be staring at my Apple Watch to use it. The current Apple HIG implies their [gesture strategy](https://developer.apple.com/design/human-interface-guidelines/gestures) is universal across devices, but in my experience it is confused.

They really nailed scrolling. Despite the indirect nature of the gesture, it responds naturally and feels like your fingers are connected to the content in that way only direct touch interfaces and Apple trackpads do. Still, when I have a Mac connected so my trackpad can also be used to control visionOS apps, I prefer using it over lifting my arm. This could be due to my familiarity, or a result of the so-called gorilla arm effect.

Overall, I think it’s wise they have opted for a small set of controller-free interactions by default. As when Steve Jobs chose a single-button mouse for the Lisa and Macintosh, they are using their power of the default operating environment to encourage simplicity. Developers may require a complex input system, but can’t simply do so out of laziness as we’ve seen with context-clicks and “more” menus.

But I believe spatial computing requires a bit more complexity. Consider how much GUI relies on spatial metaphors, using a sense of movement to establish context. When the computing environment is anchored to real space, the need for navigation does not disappear. No one’s house or workplace is large enough to house Wikipedia. One of the launch games, BorderLeap’s Illustrated, requires navigating around a museum and must resort to awkward magic floor arrows. I hope Apple introduces some navigation gestures (similar to the multitouch gestures on their other platforms) or standard UI controls before too much chaotic diversity ensues.[^commands]

[^commands]: I am reminded of [Fred Beecher’s quip](https://web.archive.org/web/20090906053155/http://johnnyholland.org/2009/08/17/the-iphone-is-not-easy-to-use-a-peek-into-the-future-of-experience-design/) that “Gestural user interfaces (UIs) are the 21st century's version of the command line interface… they're really fast and easy provided you've memorized a bunch of commands.”

## Focus and Targeting

The eye-tracking focus is the boldest choice Apple has made. I’ve been waiting to write this post until I settled on a stronger opinion than I have, but here we are.

When it flows, it’s lovely. It feels like negative latency, as if the UI is responding to my intention before I’m even aware of my movement. Exemplary apps have focus states that give me confidence in targeting without latching my attention.

But too often the focus state misses that perfect balance. Targets within a web page often vary in size and padding such that scanning them feels like a distracting carnival game. Meanwhile, the tab bars in Safari seem confused between saying “I’m the active one” and “this is the one you’re focused on”, making me too conscious of the interaction.

Paradoxically, when focus is unambiguous, the fluid recognition of targets disrupts my flow state. It is best illustrated by one of my common workflows where I place two browser windows side-by-side and scroll the left one while comparing with another on the right. On either macOS or iPadOS, I can move as fast as I can think, scrolling the left while already reading the right. You probably can see the problem coming; on visionOS the process of my intention-to-scroll leading to the finger gesture and being recognized by the system is slower than than that of my eyes moving to the right and the gaze detection moving focus. So while I am thinking “scroll the left, then read the right” instead I find myself scrolling the right.

It all works if I just slow my interaction down ever so slightly, either consciously or by making everything large enough that the movement of my gaze takes longer. It feels like trying to type on an underpowered phone’s virtual keyboard, though in this case seemingly caused by the focus recognition being too fast!

I believe I will adjust to this and learn to stare correctly just a few milliseconds longer when scrolling, but this is by no means as immediately intuitive as the first time you used an iPhone.

## Multitasking

Perhaps the most glaring problem in visionOS, as Apple’s first proposal for spatial computing, is multitasking. For simple situations and short periods, the use of space itself is both sufficient and brilliant. Only the tap, scroll, and zoom interactions of touch UI deserve the label “natural” as well as managing multiple contexts by placing them in different physical places. The metaphors are so obvious they barely qualify as metaphors: leave the entertainment apps running in the living room, email in the office, recipe apps in the kitchen.

But when you need to juggle many tools and switch between contexts, the visionOS offering for multitasking is … nonexistent. It feels like using the classic Macintosh GUI where I had to manually move windows around to find a buried one to use or simply quit.

Apple has spent decades experimenting with techniques for multitasking on desktops and their current tools for this, Spaces and Stage Manager, are quite good. I spend a lot of time in visionOS with my MacBook via Virtual Display and find myself choosing to open a new browser window on the Mac, where I can manage them with those tools. A window in visionOS is preferable for many reasons, but there is no system-wide, simple system for shuffling them in and out of my workspace. This makes them feel more _permanent_ and opening anything in visionOS seems like a commitment.

## World Anchoring

I must observe how excellent the tracking to physical space is, especially the way digital objects cast shadows and pick up light. I expect the Vision Pro is as powerful as it is because Apple plans to make this connection with the physical environment even better over time, via the fruits of their RoomDreamer research.

I really look forward to a future where I can reasonably experience AR in normal life. Bring on the [navigation ribbons](https://phys.org/news/2011-10-head-up-prize-munich.html)!

But visionOS is not ready for use while moving. My funniest moment in visionOS so far was walking when a notification came in. I instinctively looked up and pinched to read it, opening a window directly in front of my face that I walked through before really perceiving what had happened and looking back to the rear side of it.

## Cross-Device Use

I love the interaction between macOS and visionOS, which pointer, keyboard, and clipboard sharing makes much more than a simple virtual display. But it should go so much further and let me move at least Safari windows from the Mac to the Vision Pro and back.[^3D]

[^3D]: I really want the macOS desktop to render in 3D. It’s just sad to see overlapping windows and Stage Manager using 3D effects on a 2D plane within a 3D computing space.

Ironically, once I’ve made that commitment and opened an app in visionOS space, it seems trapped there. When I take the Vision Pro off, all of the notes and communication apps I find important enough to keep omnipresent in my workspace just disappear. I so often want to access the visionOS space by e.g. pointing my phone where I left a window to “grab” it.

I also want to interact with the headset without having to put it on. To download some movies from my Plex library to the Vision Pro for offline viewing required excusing myself from family to dive into visionOS space. To do this with my iPhone, iPad, or MacBook I also have to use the device directly, but that’s so much easier to do with fractional attention.

Likewise, I want more interaction with other devices from within visionOS. My MacBook gets a "connect" button above it and now I expect everything else to. I sometimes walk downstairs to my kitchen and brew tea without unplugging (sometimes “carrying” a presentation I’m watching with me). When I use my Apple Watch to set the timer, I am disappointed that I don’t get a perfectly crisp virtual display of the watch app, and cannot peel it off my wrist and leave it by the teapot.

My dream for _spatial computing_ would allow me to cast apps between devices and associate them with physical location, even without the augmented reality of visionOS.

## Social Interaction

Personas are an impressive technology demo yet still too uncanny to actually use. [Like Samuel Axon](https://arstechnica.com/gadgets/2024/03/i-worked-exclusively-in-vision-pro-for-a-week-heres-how-it-went/), I use the Vision Pro far less often than I might because my workday is mostly video calls where I need to be camera-on and despite the seamless integration with calling apps, Personas no substitute for actual video. They are just good enough, though, that I can now imagine the technique actually working.

In the real world, having other people in the room is really weird; to them, I appear like a zombie with subdued facial expressions. The EyeSight display is surprisingly effective at making it possible to interact with someone who has a computer strapped to their face, but it’s far from natural.

Even if I didn’t care about how they saw me, I want to show them things they cannot see. My partner and I both have Vision Pros, but only by inhabiting a digital space with shared windows could I imagine us wearing them together.

I can imagine doing it, though, which might seem dystopian. Michael Sacasas worries that by putting this mask on my face I am [choosing to live not as a creature, but as a machine](https://theconvivialsociety.substack.com/p/vision-con). As ever, I share his concerns about what humanity loses as we continually adopt technology, especially about these mediators of attention. Yet I don't think he's right to worry specifically about AR.

I already put my attention into cyberspace when I have my phone out. To put on a mask makes it explicit to both myself and others that I've done so. I find this an improvement, actually, as I'm so conscious of my presence when it is on, and especially feel the reconnection with reality upon taking it off.

# The Future

It will be fun to re-read this in 10 years. I hope by then spatial computing is mainstream and expect we’ll have a common language of interactions. I think we’ll be grateful for the foundation Apple’s set with hand gestures, gaze focus, and avatars, even if they are all imperfect today.
