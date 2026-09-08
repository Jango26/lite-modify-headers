/**
 * Generates the extension icons: a stack of three rounded bars standing in for
 * the rows of the rules table. Monochrome, matching the config page theme.
 *
 * Run with `node scripts/make-icons.mjs`. Only needed when the icon changes.
 */
import {deflateSync} from 'node:zlib';
import {writeFileSync, mkdirSync} from 'node:fs';

/**
 * Bar geometry on a 32x32 design grid, scaled to whatever size is rendered.
 * Kept near the edges: the browser already pads the toolbar icon, so leaving a
 * wide margin here would double up and render the mark small.
 */
const GRID = 32;
const BARS = [
    {x: 2, y: 2.5, w: 28, h: 6.5},
    {x: 2, y: 12.75, w: 17, h: 6.5},
    {x: 2, y: 23, w: 23, h: 6.5}
];
const RADIUS = 3.25;
const SAMPLES = 4;

/** Coverage of one pixel by the bar set, via NxN supersampling. */
function coverage(px, py, scale, fill) {
    let hits = 0;
    for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
            const x = toDesign((px + (sx + 0.5) / SAMPLES) / scale, fill);
            const y = toDesign((py + (sy + 0.5) / SAMPLES) / scale, fill);
            if (BARS.some((bar) => insideRoundedRect(x, y, bar))) hits++;
        }
    }
    return hits / (SAMPLES * SAMPLES);
}

/** Maps a grid coordinate back onto the design grid for a mark centred at `fill` scale. */
function toDesign(v, fill) {
    return (v - (GRID * (1 - fill)) / 2) / fill;
}

function insideRoundedRect(x, y, {x: rx, y: ry, w, h}) {
    if (x < rx || x > rx + w || y < ry || y > ry + h) return false;

    // Clamp to the rectangle inset by the corner radius; the distance from that
    // point is inside the radius everywhere except past a corner.
    const cx = Math.min(Math.max(x, rx + RADIUS), rx + w - RADIUS);
    const cy = Math.min(Math.max(y, ry + RADIUS), ry + h - RADIUS);
    return (x - cx) ** 2 + (y - cy) ** 2 <= RADIUS ** 2;
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

const STATES = {
    idle: [0x3c, 0x40, 0x43],
    green: [0x34, 0xa8, 0x53]
};

/**
 * Toolbar sizes render the mark full-bleed, since the browser supplies its own
 * padding. The 128 store tile is shown as-is, so it gets a margin of its own.
 */
const SIZES = [
    {size: 16, fill: 1},
    {size: 32, fill: 1},
    {size: 48, fill: 1},
    {size: 128, fill: 0.8}
];

mkdirSync('public/icons', {recursive: true});
for (const [state, rgb] of Object.entries(STATES)) {
    for (const {size, fill} of SIZES) {
        const name = state === 'idle' ? `rows-${size}.png` : `rows-green-${size}.png`;
        writeFileSync(`public/icons/${name}`, encodePng(size, renderRgba(size, rgb, fill)));
        console.log(`public/icons/${name}`);
    }
}
