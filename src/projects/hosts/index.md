---
title: Hosts
---

In 2024 I realized I was hosting web things on Netlify, Vercel, GitHub Pages, Hetzner, Rackspace, AWS S3, and Railway. It made me miss the days of just using Heroku for everything.

Unfortunatley, consolidating to one provider seemed unlikely. Netlify and Vercel are too "framework aware" for my taste, and [Netlify had started to smell bad](https://news.ycombinator.com/item?id=38708794). Github Pages and S3 are only useful for static sites and build processes feel like a hack.

I was happy running IndieKit on Railway, though it had been a hassle to figure out before there was a template for it. I feel good about their attention to UX, and approach. But since I now work in a firm that makes [deployment management software](https://juju.is/) I felt compelled to survey a [large number of PaaS options](https://github.com/debarshibasak/awesome-paas) and settled on installing [Coolify](./coolify) on a Hetzner ARM VPS.
