---
title: Pluggable App Architecture
categories:
- work
content-tags:
- technology
- java
- programming
---

[NFJS 2005](gateway-software-symposium-2005.html): Designing and Developing Pluggable App Architecture

[David Bock][1] clearly had not given this talk before, and it was not quite as informative as I'd hoped.

   [1]: http://www.javaguy.org/

I did get a sharper picture of how plugins should interact with their hosting application, via a specific API (which will be applied to a new [SnipSnap API][2]).  He also showed a nice workflow configuration format they developed (describing states and transitions), and some good best practices for version number assignments.  He also had a great set of guidelines for dependancies and package naming:


   [2]: http://bugs.snipsnap.org/browse/SNIPSNAP-440



  * children may import parents in package hierarchy, but not vice versa


  * peers and unrelated may import, but only in one direction: no circular dependancies!


  * Remember, "if you depend, you'll have to deploy"

David also shared a few good tool references:


  * [JDepend][3]


  * [Macker][4]


  * [PMD][5]



   [3]: http://www.clarkware.com/software/JDepend.html
   [4]: http://innig.net/macker/
   [5]: http://pmd.sourceforge.net/
