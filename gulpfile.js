const gulp  = require('gulp');
const sass = require("gulp-sass");
const shell = require('gulp-shell');


/**
  Our gulp tasks live in their own files,
  for the sake of clarity.
 */
require('require-dir')('./gulp-tasks');


/*
 Run our static site generator to build the pages
*/
gulp.task('generate', shell.task('eleventy'));


/*
  compile the assets to the correct destination
*/
gulp.task('assets', gulp.parallel(
  'styles',
  'meta'
));

/*
  Let's build, without getting data from online sources
*/
gulp.task('build:local', gulp.series(
  'clean-build',
  'generate',
  'assets'
));


/*
  Let's get the data we need and then build.
*/
gulp.task('build', gulp.series(
  // 'get:data',
  'generate',
  'assets'
));
