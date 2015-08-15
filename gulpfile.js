'use strict';

var gulp = require('gulp'),
  path = require('path'),
  fs = require('fs-promise'),
  merge = require('merge-stream'),
  es = require('event-stream'),
  chalk = require('chalk'),
  Promise = require('when');

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

gulp.task('build', ['build:chrome', 'build:firefox']);
gulp.task('build:chrome', ['copy'], taskBuildChrome);
gulp.task('build:firefox', ['copy'], taskBuildFirefox);
gulp.task('clean', taskClean);
gulp.task('copy', ['copy:commons', 'copy:platform-specific']);
gulp.task('copy:commons', ['clean'], taskCopyCommons);
gulp.task('copy:platform-specific', ['copy:commons'], taskCopyPlatfomSpecific);
gulp.task('default', ['clean', 'copy', 'build']);

function taskClean() {
  c.log('Cleaning final source code and binaries');

  var directories = [CONG.dest, CONG.bin];

  return Promise.all(directories.map(function(d) {
    return fs.emptyDir(d);
  }))
    .catch(c.error);
}

function taskBuildChrome() {
  c.log('Building Chrome...');
  // TODO: complete this
}

function taskBuildFirefox() {
  c.log('Building Firefox...');

  var converterPath = path.join(__dirname, 'node_modules', 'chrome-tailor'),
    codePath = path.join(__dirname, CONG.dest, 'firefox'),
    destPath = path.join(__dirname, CONG.bin);

  // convert the chrome manifest, using as a basis `package.json` (if exists)
  var convertManifest = require(path.join(converterPath, 'lib', 'package')).convertManifest;
  var packagePath = path.join(codePath, 'package.json');
  if (!fs.existsSync(packagePath)) {
    packagePath = null;
  }

  var makeXPI = require(path.join(converterPath, 'lib', 'xpi')).xpi;

  return makeXPI({
    cwd: codePath,
    basePackage: packagePath
  }).then(function(xpiPath) {
    gulp.src(xpiPath)
      .pipe(gulp.dest(destPath))
      .on('error', c.error);
  });
}

function taskCopyCommons() {
  c.log('Copying commons source files');

  var commons = gulp.src(CONG.src.commons + '**/*.*');

  CONG.platforms.forEach(function(platform) {
    commons = commons.pipe(gulp.dest(CONG.dest + platform));
  });

  return commons;
}

function taskCopyPlatfomSpecific() {
  c.log('Copying platform-specific files');

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
      .pipe(gulp.dest(CONG.dest))
      .on('error', c.error);
  });

  return merge.apply(merge, commonsStreams);
}
