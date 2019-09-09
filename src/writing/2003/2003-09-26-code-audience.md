---
title: Code audience
categories:
- work
content-tags:
- programming
---

I just ran across a great essay from Bruce Eckel in reaction to a summit he attended: [The Ideal Programmer][1].  He makes several great points, but his first is why I'm noting it here.

   [1]: http://mindview.net/WebLog/log-0038

	**Programming is about communication between humans.**

This is one of my favorite personal mantras, and one that I chant to others regularly.  Specifically, I make the point that source code is meant to be read by humans.  Writing code that the machine understands is the easy part, and far too many developers see communicating what they want done to the interpreters and compilers as an end goal.  Consistently, I find myself defending (to a variety of audiences) that the readability of code for maintenance is at least as important as functionality and performance.

Eckel has generalized this, though, discussing the importance of communication in requirements, etc.  I think it is easy for most people to understand the importance of communicating for project coordination.  Communicating to the future programmer (who, I like to point out, may be you after you've been away from the code for a while) is the piece that's easily forgotten and calls for a perspective shift.  Write for the people who will work on version 1.8, not for the machine that runs 1.0.

I like Eckel's simplification, though.  I particularly agree with the goal of changeable systems.  Hear, hear.
