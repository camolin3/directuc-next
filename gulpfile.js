'use strict';

var gulp = require('gulp'),
  path = require('path'),
  fs = require('fs-promise'),
  merge = require('merge-stream'),
  runSequence = require('run-sequence').use(gulp),
  es = require('event-stream'),
  chalk = require('chalk'),
  Promise = require('when'),
  utils = require('jpm/lib/utils'),
  xpi = require('jpm/lib/xpi');

// Console-like API for printing with colors
var c = {
  log: function(text) { console.log(chalk.cyan(text)); },
  error: function(text) { console.error(chalk.red(text)); }
};

var CONG = {
  root: './',
  src: {
    commons: 'src/',
    platformSpecific: 'platforms/'
  },
  platforms: ['chrome', 'firefox'],
  dest: 'dest/',
  bin: 'bin/'
};

gulp.task('default', function() {
  runSequence('copy');
});

gulp.task('clean', function() {
  c.log('>>>>>>>>>> Cleaning >>>>>>>>>>');

  var directories = [CONG.dest, CONG.bin];
  return Promise.all(directories.map(function(d) {
    return fs.emptyDir(d);
  }))
    .catch(c.error);
});

gulp.task('build:chrome', function() {
  c.log('>>>>>>>>>> Building Chrome... >>>>>>>>>>');
  // TODO: complete this
});

gulp.task('build:firefox', function() {
  c.log('>>>>>>>>>> Building Firefox... >>>>>>>>>>');

  var originalPath = process.cwd(),
    // load the manifest and set options
    manifest = require(path.join(originalPath, CONG.dest, 'firefox/package.json')),
    options = {
      xpiPath: path.join(originalPath, CONG.bin)
    };
  
  // change to destination directory
  process.chdir(CONG.dest + 'firefox');

  // build the .xpi
  return xpi(manifest, options)
    .then(function (xpiPath) {
    c.log('>>>>>>>>>> Successfully created xpi at ' + xpiPath);
  }).catch(c.error).then(function() {
    // go back to the root of the project
    process.chdir(originalPath);
  });
});

gulp.task('copy', function() {
  return runSequence('clean', 'copy:commons', 'copy:platform-specific');
});

gulp.task('copy:commons', function() {
  c.log('>>>>>>>>>> Copying commons source files >>>>>>>>>>');

  var commons = gulp.src(CONG.src.commons + '**/*.*');

  CONG.platforms.forEach(function(platform) {
    commons = commons.pipe(gulp.dest(CONG.dest + platform));
  });

  return commons;
});

gulp.task('copy:platform-specific', function() {
  c.log('>>>>>>>>>> Copying platform-specific files >>>>>>>>>>');

  var commonsStreams = CONG.platforms.map(function(platform) {
    // explore the files for each platform
    var globs = CONG.src.platformSpecific + platform + '/**/*.*';
    return gulp.src(globs, {base: './' + CONG.src.platformSpecific})
      .pipe(es.map(function(file, cb) {
        // does the file exists?
        var pathOnDest = file.path.replace(CONG.src.platformSpecific, CONG.dest);
        fs.exists(pathOnDest).then(function(exists) {
          if (exists) {
            // yes: append it
            fs.appendFile(pathOnDest, file.contents).then(function() {
              cb();
            });
          } else {
            // no: just copy it
            cb(null, file);
          }
        });
      }))
      .pipe(gulp.dest(CONG.dest)).on('error', c.error);
  });

  return merge.apply(merge, commonsStreams);
});
