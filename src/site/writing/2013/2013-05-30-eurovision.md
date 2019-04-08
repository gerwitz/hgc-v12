---
title: Eurovisualizing
abstract: Using a popularity contest to play with datavis.
categories:
- work
writing-tags:
- datavis
- javascript
---

As part of our eurofication, a [friend][jo] introduced us to [Eurovision][] this year by throwing a party for the finals. During the voting, she commented that there's a longstanding pattern of neighbors and friends voting for each other.

[jo]: http://joszczepanska.info/
[eurovision]: http://www.eurovision.tv/

This got me curious about this social network of nations. Not surprisingly, there has been a good degree of study in this area, notably including [recent measuring of alliances][allies] and some old [network analysis][social]. This whole area of study has even been named: "[eurovisiopsephology][ology]".

[allies]: http://arxiv.org/abs/1301.2995
[social]: http://members.ozemail.com.au/~dekker@ozemail.com.au/Connections07.pdf
[ology]: http://jasss.soc.surrey.ac.uk/9/2/1.html

In the past, I have found some success using physical network simulations to find clusters and patterns in the implicit social network of project assignments. Indeed this has previously been done with Eurovision voting by [Jens Finnas][jens]. But I wanted to play with the event I'd just witnessed, and so scraped this year's [data][] from Wikipedia and built a graph, which you can [play with here][network].

[![network screenshot](/assets/2013-05-30-eurovision/network.png)][network]

[jens]: http://jensfinnas.com/dataist/eurovision.html
[data]: http://en.wikipedia.org/wiki/Eurovision_Song_Contest_2013#Final_2

[network]: /projects/eurovision-2013/network.html

I did not find this technique as useful as it has been in the past with much larger data sets. Perhaps this is because weighted links don't apply well to the simulation of links (I settled on a consistent link size, but linearly increased the strength with vote value). Maybe this data set it just too interconnected, it certainly is moreso than my previous work, and filtering out the low-value votes helped expose some structure. Try increasing the minimum to 12 points (the highest vote) and watch the Netherlands and their friend Belgium float away together.

I intend to keep experimenting, and have begun with a [simple matrix view][matrix] and will try different physical simulations.

[![matrix screenshot](/assets/2013-05-30-eurovision/matrix.png)][matrix]

[matrix]: /projects/eurovision-2013/matrix.html
