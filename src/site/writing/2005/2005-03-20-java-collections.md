---
title: Java Collections
categories:
- work
content-tags:
- technology
- java
---

[NFJS 2005](gateway-software-symposium-2005.html): Java Collections Power Techniques

[Glen Vanderburg][1] gave an exhaustive [presentation][2] on the [Java Collections Framework][3].  Despite the mundane subject matter, this was a session worth attending.  Although most of the tips and tricks were old hat to experienced developers, I'm certain everyone learned something new.

   [1]: http://www.vanderburg.org/
   [2]: http://www.vanderburg.org/Speaking/Stuff/Collections/
   [3]: http://java.sun.com/j2se/1.4.2/docs/guide/collections/

My favorite tidbits:




  * [Collections.binarySearch(...)][4]


  * Glenn's ugly trick of using try...finally to execute code **after** a return


  * Glenn's DemandMap, a Map decorator that uses a provided Factory to create missing values


  * Overriding [removeEldestEntry(...)][5] to expire items in an LRU cache.

Glenn also highly recommended [Effective Java][6].

   [4]: http://java.sun.com/j2se/1.4.2/docs/api/java/util/Collections.html#binarySearch(java.util.List,%20java.lang.Object,%20java.util.Comparator)
   [5]: http://java.sun.com/j2se/1.4.2/docs/api/java/util/LinkedHashMap.html#removeEldestEntry(java.util.Map.Entry)
   [6]: http://www.amazon.com/exec/obidos/ASIN/0201310058/phobia-20/
