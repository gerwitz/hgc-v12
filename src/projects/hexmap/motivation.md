---
title: "Hexmap: Motivation"
---

In 2005, I was sad at how difficult I found it to reconstruct where I'd been while on holiday and  bought a [GPS logger](https://www.cbgps.com/v900/v900_index_en.htm). I also started using quantified self tools to log my everyday location, from [Plazes](https://en.wikipedia.org/wiki/Plazes) through [Moment](http://www.markwk.com/2016/11/iphone-tracking-with-moment.html), [Moves](https://techcrunch.com/2014/04/24/facebook-acquires-activity-tracking-app-moves/), and [Wanderings](https://wanderin.gs/docs/). I also used [Gowalla](https://en.wikipedia.org/wiki/Gowalla) until ~~Facebook~~ Meta killed it, have used [~~Foursquare~~ Swarm](https://swarmapp.com/) daily since then, and log rides and, recently, walks in [Strava](https://www.strave.com/). I have a lot of personal location data in dispierate formats, and have long wanted to visualize it all. There have been two problems.

First, I continue to collect and so want a system to automatically ingest new logs. That rules out most of the advice online.

Second, the arbitrary precision of all this data makes it difficult to correlate and deduplicate. After extensive experimentation with [geohash](https://www.geohash.es) and arbitrary coordinate bucketing with sample data from various latitudes, it became clear a [DGGS](https://discreteglobal.wpengine.com/) was needed. When Niantic's Pokémon Go happened, I was inspired and started a Node.js project aggregating with Google's [S2](http://s2geometry.io/), which worked fine but the state of mapping SDKs took the fun out of the exercise. Then Uber [dropped H3 on the world](https://www.uber.com/en-NL/blog/h3/), which I found more beautiful.[^hexagons] I shelved the project but tracked the progress of H3.

[^hexagons]: Anyway, [hexagons are the bestagons](https://cgpgrey.substack.com/p/hexagons-are-the-bestagons).

Over the Christmas holiday of 2024, I learned Rust and needed a project, so Hexmap was born. I kept a diary of sorts at [../devlog](../devlog).
