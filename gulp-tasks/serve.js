const gulp    = require('gulp');
const shell   = require('gulp-shell');

/*
 local webserver for development
*/
gulp.task('serve',
  shell.task('npx @11ty/eleventy --serve --port=8008')
);
