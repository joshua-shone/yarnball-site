var gulp = require('gulp');

// Compilation
var sass        = require('gulp-sass');
var styleModule = require('gulp-style-modules');

// Minification
// var htmlmin  = require('gulp-htmlmin');
var cssnano  = require('gulp-cssnano');
var uglifyjs = require('gulp-uglify');
var svgmin   = require('gulp-svgmin');

// Utilities
var gulp_if = require('gulp-if');
var spawn   = require('child_process').spawn;

// Dependencies
// var bowerFiles = require('main-bower-files');

gulp.task('static', [
  'static-index',
  'static-html',
  'static-js',
  'static-sass',
  'static-components-sass',
  'static-png',
  'static-svg',
  'static-bower',
]);

gulp.task('serve', function() {
  spawn(
    'node',
    ['server/server.js'],
    {
      stdio: 'inherit',
    }
  );
});

gulp.task('serve-debug', function() {
  spawn(
    'node-debug',
    ['server/server.js'],
    {
      stdio: 'inherit',
    }
  );
});

gulp.task('static-index', function() {
  return gulp.src('index.html')
//     .pipe(htmlmin({collapseWhitespace: true, minifyJS: true}))
    .pipe(gulp.dest('dist/'));
});

gulp.task('static-html', function() {
  return gulp.src('assets/**/*.html')
//     .pipe(htmlmin({collapseWhitespace: true, minifyJS: true}))
    .pipe(gulp.dest('dist/assets/'))
//     .pipe(browserSync.stream());
});

gulp.task('static-js', function() {
  return gulp.src('assets/**/*.js')
    .pipe(uglifyjs())
    .pipe(gulp.dest('dist/assets/'))
//     .pipe(browserSync.stream());
});

gulp.task('static-sass', function() {
  return gulp.src('assets/*.sass')
    .pipe(gulp_if('!_*.sass', sass()))
    .pipe(cssnano())
    .pipe(gulp.dest('dist/assets/'))
//     .pipe(browserSync.stream());
});

gulp.task('static-components-sass', function() {
  return gulp.src('assets/*/*.sass')
    .pipe(gulp_if('!_*.sass', sass()))
    .pipe(cssnano())
    .pipe(styleModule())
    .pipe(gulp.dest('dist/assets/'))
//     .pipe(browserSync.stream());
});

gulp.task('static-png', function() {
  return gulp.src('assets/**/*.png')
    .pipe(gulp.dest('dist/assets/'))
//     .pipe(browserSync.stream());
});

gulp.task('static-svg', function() {
  return gulp.src('assets/**/*.svg')
    .pipe(svgmin())
    .pipe(gulp.dest('dist/assets/'))
//     .pipe(browserSync.stream());
});

gulp.task('static-bower', function() {
//   gulp.src(bowerFiles())
  return gulp.src('bower_components/**/*')
//     .pipe(gulp_if('*.js', uglifyjs()))
//     .pipe(gulp_if('*.html', htmlmin()))
    .pipe(gulp_if('*.css', cssnano()))
    .pipe(gulp.dest('dist/bower_components/'));
});