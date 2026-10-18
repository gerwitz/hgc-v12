---
date: 2026-10-18T21:31:33.522+02:00
title: Smol Servers
---


As part of making my site's content available as a Gemini capsule, I created a Docker image that invokes Eleventy during build and serves both HTTP and Gemini protocol at runtime.
=> https://github.com/gerwitz/calmserve

Now I see Sava has created a simple web server image that uses ZIM files.
=> gemini://sava.rocks/blog/a-tiny-docker-image-for-serving-
static-files/

This is a fascinating idea, and makes me wonder if I could manage a completely in-memory server using ZIM. I'm in the process of adding photos to the site, but those are proxied from a separate object store anyway.

To stay authentic to the spirit of ZIM, I think such a server would need to replace the current client-side search with a server lookup against a ZIM index. That feels idiomatic, though, and doesn't offend me like so much other server-side processing does. And it would make search available in the Gemini capsule.


