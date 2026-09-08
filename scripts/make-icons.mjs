/**
 * Generates the extension icons: a bold letter M, full-bleed on the canvas.
 * Green when rules are running, grey when stopped.
 *
 * Run with `node scripts/make-icons.mjs`. Only needed when the icon changes.
 */
import {deflateSync} from 'node:zlib';
import {writeFileSync, mkdirSync} from 'node:fs';

/**
 * The M outline on a 32x32 design grid, as a closed polygon walked clockwise
 * from the top-left. Only a hair of margin: the browser already pads the
 * toolbar icon, so anything more here renders the mark small.
 */
const GRID = 32;
const M = [
    [1, 1],
    [9.5, 1],
    [16, 12],
    [22.5, 1],
    [31, 1],
    [31, 31],
    [23.5, 31],
    [23.5, 12.5],
    [17.5, 22.5],
    [14.5, 22.5],
    [8.5, 12.5],
    [8.5, 31],
    [1, 31]
];
const SAMPLES = 4;

/** Even-odd crossing test against the polygon edges. */
function inside(x, y) {
    let hit = false;
    for (let i = 0, j = M.length - 1; i < M.length; j = i++) {
        const [xi, yi] = M[i];
        const [xj, yj] = M[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
}

/** Coverage of one pixel by the mark, via NxN supersampling. */
function coverage(px, py, scale, fill) {
    let hits = 0;
    for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
            const x = toDesign((px + (sx + 0.5) / SAMPLES) / scale, fill);
            const y = toDesign((py + (sy + 0.5) / SAMPLES) / scale, fill);
            if (inside(x, y)) hits++;
        }
    }
    return hits / (SAMPLES * SAMPLES);
}

/** Maps a grid coordinate back onto the design grid for a mark centred at `fill` scale. */
function toDesign(v, fill) {
    return (v - (GRID * (1 - fill)) / 2) / fill;
}

function renderRgba(size, [r, g, b], fill) {
    const scale = size / GRID;
    const rows = [];
    for (let y = 0; y < size; y++) {
        const row = Buffer.alloc(size * 4 + 1); // leading byte is the PNG filter type
        for (let x = 0; x < size; x++) {
            const alpha = Math.round(coverage(x, y, scale, fill) * 255);
            row.set([r, g, b, alpha], 1 + x * 4);
        }
        rows.push(row);
    }
    return Buffer.concat(rows);
}

const CRC_TABLE = Array.from({length: 256}, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});

function crc32(buf) {
    let c = 0xffffffff;
    for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit depth, truecolour with alpha

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(rgba, {level: 9})),
        chunk('IEND', Buffer.alloc(0))
    ]);
}

/** Green matches `--color-accent` in src/index.css; change both together. */
const COLOR = [0x34, 0xa8, 0x53];

/**
 * Toolbar sizes render the mark full-bleed, since the browser supplies its own
 * padding. The 128 store tile is shown as-is, so it gets a margin of its own.
 */
const SIZES = [
    {size: 16, fill: 1},
    {size: 32, fill: 1},
    {size: 48, fill: 1},
    {size: 128, fill: 0.86}
];

mkdirSync('public/icons', {recursive: true});
for (const {size, fill} of SIZES) {
    const name = `m-${size}.png`;
    writeFileSync(`public/icons/${name}`, encodePng(size, renderRgba(size, COLOR, fill)));
    console.log(`public/icons/${name}`);
}
