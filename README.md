# hans.gerwitz.com

[![Netlify Status](https://api.netlify.com/api/v1/badges/5c7e6706-a749-45da-b3ef-f8b74826d030/deploy-status)](https://app.netlify.com/sites/hgc-v12/deploys)

[![Website Archivability Testing](http://archiveready.com/img/archiveready-badge.png)](http://archiveready.com/check?url=https://hans.gerwitz.com/)

## Building

Source files are in `/src` and site is built to `/_site`.

To set up, from the root directory: `gulp build`
To test: `gulp serve`

## Standards

Javascript is 100% optional. CSS is also optional, but without it everything will be ugly.

URLs don't change. If they do, a 301 redirect is put in place at the old URL.

Navigation and URL structure match as closely as is reasonable.

"Static page" URLs are "pretty" and end with `/`.

"Dated content" URLs (e.g. under `/writing` and `/notes`) end with `title-slug.html`.
