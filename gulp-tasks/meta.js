var project = require('./_project.js');
var gulp    = require('gulp');

// Copy _meta to site root
gulp.task('meta', function (done) {
  gulp.src(project.buildSrc + '/meta/**/*')
    .pipe(gulp.dest(project.buildDest+ '/'))
	done();
});
