const gulp    = require('gulp');
const shell   = require('gulp-shell');

/*
 test internal links
*/
gulp.task('links-internal',
  shell.task('hyperlink -ri --root _site --canonicalroot https://hans.gerwitz.com/ _site/*.html ' +
  ' --skip .rss' +
  ' --skip _site/library' +
  ' --skip _site/now' +
  ' --skip _site/using' +
  ' --skip JavaScript' +
  ' | tap-spot')
);
