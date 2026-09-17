/**
 * Scales one image to cover an exact box and crops the overflow off the bottom
 * and the right edge.
 *
 *   osascript -l JavaScript scripts/resize/resize-one.js <in> <out> <width> <height>
 *
 * Driven by scripts/resize/resize-images.mjs. This lives in JXA rather than in the
 * Node script because it needs AppKit: `sips` can only crop from the centre
 * (its --cropOffset is silently ignored), and anchoring the crop is the whole
 * point here.
 */
ObjC.import('AppKit');

function run(argv) {
    const [inPath, outPath, widthArg, heightArg] = argv;
    const width = parseInt(widthArg, 10);
    const height = parseInt(heightArg, 10);

    const source = $.NSImageRep.imageRepWithContentsOfURL($.NSURL.fileURLWithPath($(inPath)));
    if (source.isNil()) throw new Error('not a readable image');

    const canvas = newCanvas(width, height);
    draw(source, canvas, width, height);
    write(canvas, outPath);
    return 'ok';
}

function draw(source, canvas, width, height) {
    // Cover: scale by the larger of the two ratios, so neither side falls short
    // of the box and leaves a transparent gap.
    const scale = Math.max(width / source.pixelsWide, height / source.pixelsHigh);
    const scaledWidth = Math.ceil(source.pixelsWide * scale);
    const scaledHeight = Math.ceil(source.pixelsHigh * scale);

    // Assigning to `currentContext` looks like it works — drawInRect even
    // returns true — but nothing lands on the canvas. Only the bridged
    // setCurrentContext() actually installs the context. save/restore
    // GraphicsState are not bridged at all, so the old one is put back by hand.
    const previous = $.NSGraphicsContext.currentContext;
    $.NSGraphicsContext.setCurrentContext($.NSGraphicsContext.graphicsContextWithBitmapImageRep(canvas));
    // Cocoa's origin is the bottom-left corner, so pushing the scaled image
    // down by (scaledHeight - height) lines its top edge up with the top of the
    // canvas. What falls outside is then the bottom and the right.
    source.drawInRect($.NSMakeRect(0, height - scaledHeight, scaledWidth, scaledHeight));
    $.NSGraphicsContext.setCurrentContext(previous);
}

function newCanvas(width, height) {
    return $.NSBitmapImageRep.alloc.initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(
        $(),
        width,
        height,
        8,
        4,
        true,
        false,
        $.NSDeviceRGBColorSpace,
        0,
        0
    );
}

/** Keeps the source extension, so a .jpg in stays a real JPEG out. */
function write(canvas, outPath) {
    const jpeg = /\.jpe?g$/i.test(outPath);
    const type = jpeg ? $.NSBitmapImageFileTypeJPEG : $.NSBitmapImageFileTypePNG;
    const properties = jpeg ? $({NSImageCompressionFactor: 0.92}) : $();
    const data = canvas.representationUsingTypeProperties(type, properties);
    if (!data.writeToFileAtomically($(outPath), true)) throw new Error('could not write ' + outPath);
}
