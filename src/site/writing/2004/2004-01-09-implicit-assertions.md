---
title: Implicit assertions
categories:
- uncategorized
content-tags:
- tagless
---

Here's a fun quote from [Tony
Hoare][1]'s _[Towards the Verifying
Compiler][2]_:
	A global program analysis tool called PREfix is now widely used by Microsoft development teams.  PREfix works by analysing all paths through each method body, and it gives a report for each path on which there may be a defect. The trouble is that most of the paths can never in fact be activated.  The resulting false positive messages are called noise, and they still require considerable human effort to analyse and reject; and the rejection of noise is itself highly prone to error.  It is rumoured that the recent Code Red virus gained access through a loophole that had been detected by PREfix and deliberately ignored.

   [1]: http://research.microsoft.com/~thoare/
   [2]: http://www.iist.unu.edu/colloquium/Post_Colloquium.data/Components/Papers/Hoare.pdf

That paper spends some time introducing [assertions][3].  Some of his examples would easily be handled by a daydream I've recently had: why can't a pre-compilation step test implicit assertions?  I don't mean a PREfix-like tool that essentially runs code through every possible execution path, or the "simplifying assumptions" Hoare mentions.  Rather, errors discovered in code review often fall into a class of "dumb mistakes" that even experienced developers are prone to making.

   [3]: http://java.sun.com/j2se/1.4.2/docs/guide/lang/assert.html

When you enter a loop, you're implicitly asserting that somewhere in it's execution you'll modify a variable used in the end case (or break the loop).  If you test that a reference is null, then the nested block shouldn't use it; likewise, if you test for a valid reference, then you're asserting that you intend to use it.  Starting a for loop implies you're going to be using the counter variable.  Collections that are created and then called upon without and insertions are likely mistakes.

Today's compilers (and IDEs, for that matter) prevent us from making most typographical errors with warnings of unreachable code, obsolete dependancies, and use of uninitialized variables.  I want smarter warnings, though, something more advanced than what we've come to expect but less distracting than the chatter of a tool like PREfix.
