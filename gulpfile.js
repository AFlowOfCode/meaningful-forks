let gulp = require("gulp");
const terser = require("gulp-terser");
let del = require("del");
let concat = require("gulp-concat");

gulp.task("compressJS", function (cb) {
  // the same options as described above
  let terserOptions = {
    mangle: { reserved: ["FORK_LOAD_COUNT", "ACCESS_TOKEN", "DEBUG_LEVEL"] },
    compress: { defaults: false },
  };
  return gulp
    .src("src/script.js")
    .pipe(terser(terserOptions))
    .pipe(gulp.dest("dist"));
});

gulp.task("add-header", function () {
  return gulp
    .src(["src/header.js", "dist/script.js"])
    .pipe(concat("script.user.js"))
    .pipe(gulp.dest("dist"));
});

gulp.task("del-script", function () {
  del.sync("dist/script.js");
  return Promise.resolve("");
});

gulp.task("clean:dist", function () {
  return [del.sync("dist")];
});

gulp.task("watch", function () {
  gulp.watch("src/*.js", gulp.series("compressJS", "add-header", "del-script"));
});

// To compile just run $ gulp
exports.default = gulp.series("compressJS", "add-header", "del-script");
