'use strict';

var gulp = require('gulp');

gulp.task('default', ['build:chrome', 'build:firefox']);

gulp.task('build:chrome', function() {
  console.log('Building Chrome...');
});

gulp.task('build:firefox', function() {
  console.log('Building Firefox...');
});
