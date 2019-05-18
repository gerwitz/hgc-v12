---
title: XML Data Binding with JiBX
categories:
- work
content-tags:
- technology
- java
- programming
---

[Eitan Suez][1] gave a great presentation on [JiBX][2].  He had great slides for reference, but spent the session time demonstrating the use with real, from-scratch examples.  He only returned to the slides for some strong conceptual presentations, such as the weaving of XML and Java references together into a mapping file.

JiBX itself looks slick, with a simple API (al Hibernate) and strong performance optimizations.  Bytecode modification still bothers me since you can't select bindings at runtime, though, but it might be a good choice for scenarios such as Atom API implementations.  It also got me thinking about [XPP][3].

   [1]: http://u2d.com/
   [2]: http://www.jibx.org/
   [3]: http://www.xmlpull.org/
