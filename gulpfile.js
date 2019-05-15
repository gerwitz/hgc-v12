const gulp  = require('gulp');
const shell = require('gulp-shell');


/**
  Our gulp tasks live in their own files,
  for the sake of clarity.
 */
require('require-dir')('./gulp-tasks');


/*
 Run our static site generator to build the pages
*/
gulp.task('generate', shell.task('DEBUG=*Error* npx eleventy'));


/*
  compile the assets to the correct destination
*/
gulp.task('assets', gulp.parallel(
  'styles',
  'meta'
));

/*
  Let's get the data we need and then build.
*/
gulp.task('build', gulp.series(
  // 'get:data',
  'assets', // this goes first because it writes to site/_includes
  'generate'
));

gulp.task('dev', gulp.parallel(
  'build',
  'serve',
  'watch'
));

gulp.task('default', gulp.series('dev'));
