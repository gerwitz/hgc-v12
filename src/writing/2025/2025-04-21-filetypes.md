---
title: Opening a file in 2025
categories:
- work
content-tags:
- apple
- ux
---

iA Writer stopped working reliably for me. Using its included library browser told me my markdown files are, in fact, Genesis games and cannot be opened. This is probably because the developers have used Apple’s frameworks correctly; the Finder also informed me they are Genesis files.

Being too clever by half, Apple have evolved the act of associating a file to an application into a byzantine puzzle of interacting heuristics and systems, most of which are completely opaque to me, as a mere user.

I figured out this is probably because macOS recently became more aggressive about finding apps on the local drive that can be added to the database of openers. Certainly I had a Genesis emulator hiding somewhere. Yet trying to actually open one of these .md “games” tells me there is no such application.

Finally, I stumbled upon an [app by Thomas Tempelmann](https://apps.tempel.org/LaunchServices/) that let me view the relevant Launch Services database. This revealed that I had a “Daemon Container” for the Delta game emulator, [apparently just a normal artifact from having once, fleetingly, installed it in the past](https://eclecticlight.co/2024/08/05/what-are-all-those-containers/) so one newly-promiscuous macOS system could leave behind this haunting that seems to have no purpose but to distract the macOS system that lets me open a damn file.

Figuring this all out was entirely too difficult. Bouncing around the internet seeing how many other people struggle with related issues casts doubt on Apple's UX centricity.[^apple] But fixing the problem was as simple as exorcising one lingering file.

[^apple]: [Not that I have any faith left.](/2021/10/24/bad-apple.html)
