var del = require("del");
var gulp = require("gulp");
var gulpUtil = require('gulp-util');
var path = require("path");
var shell = require("shelljs");
var spawn = require('child_process').spawn;
var fs = require('fs');
var fsextra = require('fs-extra')

var buildDirectory = "_build";
var packageManifestFile = "vss-extension.json";
var packageDirectory = "_package";
var sourcePaths = {
    helpers: "src/Common/Helpers",
    sourceFiles: ["src/**/*", "tests/**/*"],
    tasksPath: "src/Tasks"
};
var srcBuildDirectory = "_build/src";

gulp.task("build", function() {
    gulp.src(sourcePaths.sourceFiles, { base: "." }).pipe(gulp.dest(buildDirectory));
    fs.readdirSync(sourcePaths.tasksPath).filter(function (file) {
        return fs.statSync(path.join(sourcePaths.tasksPath, file)).isDirectory();
    }).forEach(copyHelpers);
});

gulp.task("clean", function() {
    return del([buildDirectory, packageDirectory]);
});

gulp.task("testci", ["build"], function(done) {
    // Runs powershell pester tests ( Unit Test)
    var pester = spawn('powershell.exe', ['.\\InvokePester.ps1' ,'Tests'], { stdio: 'inherit' });
    pester.on('exit', function(code, signal) {

        if (code != 0) {
           throw new gulpUtil.PluginError({
              plugin: 'testci',
              message: 'Pester Tests Failed!!!'
           });

        }
        else {
            done();
        }
    });

    pester.on('error', function(err) {
        gutil.log('We may be in a non-windows machine or powershell.exe is not in path. Skip pester tests.');
        done();
    });
});


gulp.task("package", function() {
        del(packageDirectory);
        shell.mkdir("-p", packageDirectory);
        createVsixPackage();
});

var copyHelpers = function(taskName) {
    var targetPath = path.join(srcBuildDirectory, "Tasks", taskName);
    fsextra.copy(sourcePaths.helpers, targetPath, "*", function (err) {
        if (err) return console.error(err)
    })
}

var createVsixPackage = function() {
    var packagingCmd = "tfx extension create --manifeset-globs " + packageManifestFile + " --root " + srcBuildDirectory + " --output-path " + packageDirectory;
    executeCommand(packagingCmd, function() {});
}

var executeCommand = function(cmd, callback) {
    shell.exec(cmd, {silent: true}, function(code, output) {
       if(code != 0) {
           console.error("command failed: " + cmd + "\nManually execute to debug");
       }
       else {
           callback();
       }
    });
}

gulp.task("test", ["testci"]);

gulp.task("default", ["build"]);