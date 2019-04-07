var project = require('./_project.js');
var gulp    = require('gulp');
var sass    = require("gulp-sass");

/*
  Compile SCSS files to CSS
*/
gulp.task('styles', function(done) {

  // included CSS
  gulp.src(project.buildSrc + '/scss/secondary.scss')
    .pipe(sass({
      outputStyle: 'compressed'
    }).on('error', sass.logError))
    .pipe(gulp.dest(project.buildDest+ '/css'));

  // inlined CSS
  gulp.src(project.buildSrc + '/scss/critical.scss')
    .pipe(sass({
      outputStyle: 'compressed'
    }).on('error', sass.logError))
    .pipe(gulp.dest(project.buildSrc+ '/site/_includes/inline'));

  done();
});
