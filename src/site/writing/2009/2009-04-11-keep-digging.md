---
title: Keep Digging
categories:
- work
content-tags:
- code
- business
- technology
---

John Gruber has [called attention][1] to Digg's shameful revival of site framing, and I share his disgust.  Though I've no expectation of Digg traffic to my little blog, on principle I feel compelled to participate and block the DiggBarr from obscuring my URLs.


Phil Nelson and Shawn Medero's [DiggBarred][2] handles this nicely for Wordpress, using server scripting to present a different page to browsers loading into a DiggBar frame.  But to be polite to my little server slice, I like to use [WP Super Cache][3] in "full on" mode, which precludes consistent per-request processing by plugins.

I could use Apache mod_rewrite rules to similar affect, but that's another layer of configuration I want to avoid and is, like PHP solutions, Digg-specific.

So I'd like to use client scripting.  Faruk Ateş has offered [DiggBar killer JavaScript][4], which is still Digg-specific and [too nice][5].

[1]: http://daringfireball.net/2009/04/how_to_block_the_diggbar
[2]: http://extrafuture.com/projects/diggbarred/
[3]: http://ocaoimh.ie/wp-super-cache/
[4]: http://farukat.es/journal/2009/04/225-javascript-diggbar-killer-not-blocker
[5]: http://daringfireball.net/linked/2009/04/11/faruk-diggbar

Perhaps we should refine the typical frame-busting approach (detect when the page is framed and reload the window directly to the page) and take a frame-embracing stance (reload the page with their frame):

  <script>
    if (top !== self) {
      self.location.replace(document.referrer);
    }
  </script>

I've put that code here for testing, which can be seen by viewing this post's Digg URL: [http://digg.com/u1mst][6].

[6]: http://digg.com/u1mst
