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
var yargs   = require('yargs');

// Dependencies
// var bowerFiles = require('main-bower-files');

gulp.task('static', [
  'static-bower',
  'static-html',
  'static-js',
  'static-sass',
  'static-components-sass',
  'static-png',
  'static-svg',
]);

gulp.task('static-html', function() {
  return gulp.src('static/**/*.html')
//     .pipe(gulp_if(yargs.argv.production, htmlmin({collapseWhitespace: true, minifyJS: true})))
    .pipe(gulp.dest('dist/static/'))
//     .pipe(browserSync.stream());
});

gulp.task('static-js', function() {
  return gulp.src('static/**/*.js')
    .pipe(gulp_if(yargs.argv.production, uglifyjs()))
    .pipe(gulp.dest('dist/static/'))
//     .pipe(browserSync.stream());
});

gulp.task('static-sass', function() {
  return gulp.src('static/*.sass')
    .pipe(gulp_if('!_*.sass', sass()))
    .pipe(gulp_if(yargs.argv.production, cssnano()))
    .pipe(gulp.dest('dist/static/'))
//     .pipe(browserSync.stream());
});

gulp.task('static-components-sass', function() {
  return gulp.src('static/*/*.sass')
    .pipe(gulp_if('!_*.sass', sass()))
    .pipe(gulp_if(yargs.argv.production, cssnano()))
    .pipe(styleModule())
    .pipe(gulp.dest('dist/static/'))
//     .pipe(browserSync.stream());
});

gulp.task('static-png', function() {
  return gulp.src('static/**/*.png')
    .pipe(gulp.dest('dist/static/'))
//     .pipe(browserSync.stream());
});

gulp.task('static-svg', function() {
  return gulp.src('static/**/*.svg')
    .pipe(gulp_if(yargs.argv.production, svgmin()))
    .pipe(gulp.dest('dist/static/'))
//     .pipe(browserSync.stream());
});

gulp.task('static-bower', function() {
//   gulp.src(bowerFiles())
  return gulp.src('bower_components/**/*')
    .pipe(gulp_if(yargs.argv.production, gulp_if('*.js', uglifyjs())))
//     .pipe(gulp_if('*.html', htmlmin()))
    .pipe(gulp_if(yargs.argv.production, gulp_if('*.css', cssnano())))
    .pipe(gulp.dest('dist/static/bower_components/'));
});