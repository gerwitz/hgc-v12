---
title: Apple Glasses
abstract: Not yet, but I expect hints
categories:
- work
writing-tags:
- tech
- ar
- apple
external: http://safelyignored.com/apple-slam
---

The usual pre-WWDC buzz is in full swing.

In hardware rumors, we all but know there will be a new flagship iPhone with less non-pixel surfaces, updated MacBooks, and something for Siri to live in that helps it compete with Alexa for space in the home. We'll find out how serious Apple is about the Touch Bar.

On the software side, iOS-on-iPad is likely to get better multi-tasking (with drag-and-drop), and old-fashioned file management will continue leaking back into the mobile platforms. Photos needs to get smarter and less device-trapper to keep up with Google.

UI designers will be looking closely for new patterns in iOS 11, with some anticipation that [navigation will adapt to the new reality of too-big-to-thumb screens](https://medium.com/tall-west/lets-ditch-the-nav-bar-3692cb17cc67). It's certain SiriKit will add new capability domains for voice.

Father on the fringes of the rumor mill, we've heard that the iOS SpringBoard (home screen) may be reworked. While I'm skeptical of big changes to SpringBoard, I'm hoping this is a sign that Proactive Toolbox will be extending to be more present in device use, e.g. on the home screen, lock screens, watch faces, or even Quickboard.

And at the very edge, we have recent hints that [Project Mirrorshades](https://www.reddit.com/r/apple/comments/6ezhwm/iama_foxconn_insider_with_information_on_next_12/diel4xg/) lives on, and could be nearing release as Apple Iris.

I don't expect glasses from Apple this year, but I think we'll see movements in the direction of AR. More than the usual Tim Cook hints.

The "Iris" naming is questionable, as they trademarked "Iris Image Engine" shortly before releasing the iPhone 7. This suggests they considered branding the system that enables the iPhone 7 Plus to use two cameras as one. That system is clearly a result of the Linx Imaging acquisition in early 2015. Since we're soon to see Apple designing their own GPUs, it's likely "Iris" will describe a hardware/software system for image processing, which I expect to feature depth sensing.

Apple has been interested in depth sensing at least since they bought PrimeSense (who made the Kinect) in 2013. It is commonly believed this was for Project Titan, but even then it seemed clear that LiDAR was going to be the dominant sensing approach for vehicles. Structured light was more appropriate for SLAM, as then demonstrated by Google's use of PrimeSense in Project Tango.

Since then, structured light has been stalled. ToF sensors like those from Infineon are more robust and easier to miniaturize. Industry leaders like Qualcomm have been investing in computational photography for SLAM, and even Occipital is using cameras with normal image sensors for their next generation OEM kits.

Apple has been relatively open about their interest in AR, so how will they bring SLAM to the market? We cannot expect them to release a product like Mirrorshades until the sensors can be manufactured at scale, the computing is reliable and power-efficient, and a software ecosystem of partners can be bootstrapped. Yet they will [roll](http://www.macworld.com/article/1151235/macs/apple-rolls.html) something out that lets them experiment on these three fronts, as they have so often before.[^rolling]

[^rolling]: With hardware, it's widely noted they learned with the G5 for aluminum casings, fancy paperclips for Liquidmetal molding, and the Watch for sapphire screens, OLED displays, and zirconia ceramic casings. More analogous to SLAM, consider the iPhone 5 motion processor before the Watch, the iMac for Fusion storage, and the Mac Pro for OpenCL processor pools.

My guess it that the not-quite-Apple-polished rollout of dual cameras in the iPhone 7 Plus was toward this end. Establish that the camera team can make one virtual sensor out of one, at Apple scale, before iterating towards realtime depth sensing. If the iPhone 8 indeed has dual cameras arranged vertically and iOS 11 introduces a mixed reality SDK with iPhone 8-only features, then we'll know they're taking the [Linx camera-based depth sensing](https://www.scribd.com/doc/261875793/LinX-Imaging-Presentation#page=21) to the next step.

Notably missing from this theory that we're watching the ancestry of Apple Glasses unfold is the display. For evolutionary purposes, looking through your phone is fine, but I can't imagine translucent displays like HoloLens will be acceptable. I haven't seen any signs that Cupertino is building anything like Magic Leap. But the UW professor who cofounded them [spoke about their tech at Stanford in 2011](https://talks.stanford.edu/brian-schowengerdt-near-to-eye-volumetric-3d-displays-using-scanned-light/) so maybe they've been inspired for 6 years already.
