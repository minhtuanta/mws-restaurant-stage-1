const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();
const autoprefixer = require('autoprefixer');
const del = require('del');
const mergeStream = require('merge-stream');
const util = require('gulp-util');
const runSequence = require('run-sequence');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const babelify = require('babelify');

const args = process.argv.slice(3);

gulp.task('clean', done => {
    return del(['build'], done);
});

gulp.task('copy', () => {
    return mergeStream(
        gulp.src('*.html').pipe(gulp.dest('build/')),
        gulp.src('icons/**/*').pipe(gulp.dest('build/icons')),
        gulp.src('manifest.json').pipe(gulp.dest('build')),
        gulp.src('sw.js').pipe(gulp.dest('build'))
    );
});

gulp.task('css', () => {
    return gulp.src('styles/**/*.scss')
        .pipe(plugins.sass.sync().on('error', plugins.sass.logError))
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.sass({outputStyle: 'compressed'}))
        .pipe(plugins.postcss([autoprefixer({browsers: ['> 1%'], cascade: false})]))
        .pipe(plugins.sourcemaps.write('./'))
        .pipe(gulp.dest('build/css/'));
});

const jsBundles = {
    'build/js/app.js': createBundle('js/app.js'),
    'build/js/main.js': createBundle('js/main.js'),
    'build/js/restaurant_info.js': createBundle('js/restaurant_info.js')
};

function createBundle(src) {
    if (!src.push) {
        src = [src];
    }

    const b = browserify({
        entries: src,
        debug: true
    });

    b.transform('babelify', {presets: ['env']});

    return b;
}

function bundle(b, outputPath) {
    const splitPath = outputPath.split('/');
    const outputFile = splitPath[splitPath.length - 1];
    const outputDir = splitPath.slice(0, -1).join('/');

    return b
        .bundle()
        .pipe(source(outputFile))
        .pipe(buffer())
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.uglify()).on('error', util.log)
        .pipe(plugins.sourcemaps.write('./'))
        .pipe(gulp.dest(outputDir));
}

gulp.task('scripts', () => {
    return mergeStream.apply(null, Object.keys(jsBundles).map(key => {
        return bundle(jsBundles[key], key);
    }))
});

gulp.task('images', () => {
    return gulp.src('img/**/*')
        .pipe(plugins.imagemin({
            progressive: true
        }))
        .pipe(gulp.dest('build/img'));
});

gulp.task('watch', () => {
    gulp.watch(['styles/**/*.scss'], ['css']);
    gulp.watch(['js/**/*.js'], ['scripts']);
    gulp.watch(['*.html', 'sw.js', 'data/**/*', 'img/**/*'], ['copy']);
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
    runSequence('clean', ['css', 'scripts', 'images', 'copy'], callback);
});

gulp.task('serve', callback => {
    runSequence('build', ['server', 'watch'], callback);
});
