const gulp  = require('gulp');

/**
  Our gulp tasks live in their own files,
  for the sake of clarity.
 */
require('require-dir')('./gulp-tasks');

gulp.task('build', gulp.series(
  'generate'
));

gulp.task('default', gulp.series('build'));
