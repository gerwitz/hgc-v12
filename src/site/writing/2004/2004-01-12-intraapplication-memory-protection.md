---
title: Intraapplication memory protection
categories:
- uncategorized
writing-tags:
- tagless
---

I've gotten spoiled by [modern PC
OSes][1].  I typically have an uptime of several weeks, and reboot only for major OS updates or new versions of [SideTrack][2].  This (along with [Expos][3]) enables my habit of using open windows as task management: leaving an email open as a separate window to remind me to respond, not closing IM chat windows until I've answered all questions brought up, contact windows for people I need to call, and document windows for items I need to proof.

   [1]: http://www.apple.com/macosx/
   [2]: http://www.ragingmenace.com/software/sidetrack/
   [3]: http://www.apple.com/macosx/panther/expose/

Regularly, though, tasks-in-progress are represented by web pages related to research: often from the web view of our CVS repository, or a blog entry I came across in NetNewsWire I intend to read as time permits.  Regularly, I have 4 or 5 windows open with several related tabs in each.  Sometimes, the less critical issues are represented by tabs that have been waiting for two or three days.

Then, I'll visit some page that embeds a Java applet or Flash movie with a memory leak.  So, Safari crashes.  That tab doesn't just disappear, but the entire application exits, taking all that offloaded mental state with it.  This leaves me [a bit
frustrated][4].

   [4]: http://www.galindorf.com/images/darknessgal/dtl/ghouldtl.jpg

There has to be some way the Safari team can partition each page viewer into a protected memory space, providing bulkheads to shield the rest of my life from one misbehaving plugin.
