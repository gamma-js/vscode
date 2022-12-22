/* eslint-disable header/header */
const gulp = require('gulp');
const transform = require('gulp-transform');
// const typescript = require('gulp-typescript');
// const sourcemaps = require('gulp-sourcemaps');
// const alias = require('@gulp-plugin/alias');
// const merge = require('merge2');
const jsonEditor = require('gulp-json-editor');
const path = require('path');
const manifest = require('../package.json');
// Promisify exec
const exec = require('child_process').exec;
const util = require('util');
const execAsync = util.promisify(exec);

const OUT_DIR = path.join(__dirname, '../out-gamma');

gulp.task('gamma-tsc-resolve-paths', () => {
	return gulp.src(`${OUT_DIR}/**/*.js`)
		.pipe(transform('utf-8', createPathResolver()))
		.pipe(gulp.dest(OUT_DIR));
});

function createPathResolver() {
	const REQUIRE_REGEX = /^(.*require\(\")(vs\/[^"]+)("\).*)$/;
	const VS_ROOT = OUT_DIR;

	return (content, file) => {
		const lines = content.split('\n');
		const vsPath = `vs/${path.relative(VS_ROOT, file.path)}`;

		const vsPathBase = path.dirname(vsPath);

		let fileModified = false;

		// for each line
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// match require('vs/...')
			const match = line.match(REQUIRE_REGEX);
			if (match) {
				const [, prefix, imported, suffix] = match;
				let resolvedImport = path.relative(vsPathBase, imported);
				if (!resolvedImport.startsWith('..')) {
					resolvedImport = `./${resolvedImport}`;
				}
				// console.log(file.path);
				// console.log(vsPath);
				// console.log(vsPathBase);
				// console.log(`${imported} -> ${resolvedImport}`);
				lines[i] = `${prefix}${resolvedImport}${suffix}`;
				// console.log(lines[i]);
				// console.log('---------------');
				fileModified = true;
			}
		}

		return fileModified ? lines.join('\n') : content;
	};
}

// Get short git hash via `git rev-parse --short HEAD`
async function getGitHash() {
	const { stdout } = await execAsync('git rev-parse --short HEAD');
	return stdout.trim();
}

gulp.task('gamma-manifest', async () => {
	// Check if we are in production mode
	const isProd = process.env['NODE_ENV'] === 'production';
	let version = manifest.version;
	if (!isProd) {
		console.log('Not in production mode, appending git hash to version.');
		version = `${version}+${await getGitHash()}`;
	}
	console.log(`Setting version to ${version}.`);
	return gulp.src(path.join(__dirname, '../gamma-packages/vscode/package.json'))
		.pipe(jsonEditor({
			version: version,
		}))
		.pipe(gulp.dest(OUT_DIR));
});
