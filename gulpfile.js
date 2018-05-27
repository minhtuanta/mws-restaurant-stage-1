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

gulp.task('scripts', () => {
    return gulp.src('js/**/*.js')
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.babel({
            presets: [
                ['env', {
                    'targets': {
                        'browsers': ['>0.25%']
                    }
                }]
            ]
        }))
        .pipe(plugins.uglify())
        .pipe(plugins.sourcemaps.write('./'))
        .pipe(gulp.dest('build/js'));
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
