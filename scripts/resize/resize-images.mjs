/**
 * Resizes every image in a directory to an exact size, keeping the aspect ratio.
 *
 *   node scripts/resize/resize-images.mjs <dir> <width>x<height>
 *
 * The output lands in `<dir>/resize/`, under the same filenames. Source images
 * whose ratio does not match the target are scaled to
 * cover the box and then cropped from the top-left corner, so the overflow is
 * always taken off the bottom (too tall) or the right edge (too wide).
 *
 * The pixels are pushed around by scripts/resize/resize-one.js via `osascript`, so
 * this only runs on macOS. That keeps the repo free of a native image
 * dependency for a script nobody runs during a build.
 */
import {execFileSync} from 'node:child_process';
import {mkdirSync, readdirSync} from 'node:fs';
import {join, dirname, resolve, extname, basename} from 'node:path';
import {fileURLToPath} from 'node:url';

const EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff', '.gif', '.bmp']);
const RESIZE_ONE = join(dirname(fileURLToPath(import.meta.url)), 'resize-one.js');

function parseArgs(argv) {
    const [dir, size] = argv;
    if (!dir || !size) fail('usage: node scripts/resize/resize-images.mjs <dir> <width>x<height>');

    const match = /^(\d+)x(\d+)$/.exec(size);
    if (!match) fail(`bad size "${size}", expected something like 1200x630`);

    return {dir: resolve(dir), width: Number(match[1]), height: Number(match[2])};
}

function fail(message) {
    console.error(message);
    process.exit(1);
}

function listImages(dir) {
    let entries;
    try {
        entries = readdirSync(dir, {withFileTypes: true});
    } catch {
        return fail(`cannot read directory ${dir}`);
    }

    const images = entries.filter((e) => e.isFile() && EXTENSIONS.has(extname(e.name).toLowerCase()));
    if (images.length === 0) fail(`no images found in ${dir}`);
    return images;
}

function resizeOne(file, outFile, width, height) {
    const args = ['-l', 'JavaScript', RESIZE_ONE, file, outFile, String(width), String(height)];
    // resize-one.js answers 'ok' only after the file is on disk, so the sentinel
    // is what confirms a write.
    const out = execFileSync('osascript', args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
    if (out.trim() !== 'ok') throw new Error(out.trim() || 'osascript wrote nothing');
}

/** Digs the real message out of osascript's `<file>: execution error: Error: ... (-2700)` wrapper. */
function reason(error) {
    const raw = String(error.stderr || error.message).trim();
    return /Error: (.+?) \(-\d+\)\s*$/.exec(raw)?.[1] ?? raw;
}

const {dir, width, height} = parseArgs(process.argv.slice(2));
const outDir = join(dir, 'resize');
const images = listImages(dir);

mkdirSync(outDir, {recursive: true});

let done = 0;
for (const image of images) {
    try {
        resizeOne(join(dir, image.name), join(outDir, image.name), width, height);
        done += 1;
        console.log(`${image.name} -> ${basename(outDir)}/${image.name}`);
    } catch (error) {
        console.error(`skipped ${image.name}: ${reason(error)}`);
    }
}

console.log(`\n${done}/${images.length} images written to ${outDir} at ${width}x${height}`);
