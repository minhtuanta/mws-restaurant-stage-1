const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();
const autoprefixer = require('autoprefixer');
const del = require('del');
const mergeStream = require('merge-stream');
const util = require('gulp-util');
const runSequence = require('run-sequence');

const args = process.argv.slice(3);

gulp.task('clean', done => {
    return del(['build'], done);
});

gulp.task('copy', () => {
    return mergeStream(
        gulp.src('*.html').pipe(gulp.dest('build/')),
        gulp.src('js/**/*.js').pipe(gulp.dest('build/js')),
        gulp.src('data/**/*').pipe(gulp.dest('build/data/')),
        gulp.src('img/**/*').pipe(gulp.dest('build/img')),
        gulp.src('manifest.json').pipe(gulp.dest('build')),
        gulp.src('sw.js').pipe(gulp.dest('build'))
    );
});

gulp.task('css', () => {
    return gulp.src('styles/**/*.scss')
        .pipe(plugins.sass.sync().on('error', plugins.sass.logError))
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.sass({ outputStyle: 'compressed' }))
        .pipe(plugins.postcss([autoprefixer({browsers: ['> 1%'], cascade: false})]))
        .pipe(plugins.sourcemaps.write('./'))
        .pipe(gulp.dest('build/css/'));
});

gulp.task('watch', () => {
    gulp.watch(['styles/**/*.scss'], ['css']);
    gulp.watch(['*.html', 'js/**/*.js', 'data/**/*', 'img/**/*'], ['copy']);
});

gulp.task('server', () => {
    plugins.developServer.listen({
        path: './server.js',
        args: args
    });

    gulp.watch([
        'server.js'
    ], plugins.developServer.restart);
});

gulp.task('build', callback => {
    runSequence(['css', 'copy'], callback);
});

gulp.task('serve', callback => {
    runSequence('clean', 'build', ['server', 'watch'], callback);
});
