import Canvas from './lib/canvas';
import Image from './lib/image';
import CanvasRenderingContext2D from './lib/context2d';
import CanvasPattern from './lib/pattern';
import parseFont from './lib/parse-font';
import packageJson from './package.json';
import bindings from './lib/bindings';
import fs from 'fs';
import PNGStream from './lib/pngstream';
import PDFStream from './lib/pdfstream';
import JPEGStream from './lib/jpegstream';
import { DOMPoint, DOMMatrix } from './lib/DOMMatrix';

function createCanvas (width, height, type) {
  return new Canvas(width, height, type)
}

function createImageData (array, width, height) {
  return new bindings.ImageData(array, width, height)
}

function loadImage (src) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    function cleanup () {
      image.onload = null;
      image.onerror = null;
    }

    image.onload = () => { cleanup(); resolve(image); };
    image.onerror = (err) => { cleanup(); reject(err); };

    image.src = src;
  })
}

/**
 * Resolve paths for registerFont. Must be called *before* creating a Canvas
 * instance.
 * @param src {string} Path to font file.
 * @param fontFace {{family: string, weight?: string, style?: string}} Object
 * specifying font information. `weight` and `style` default to `"normal"`.
 */
function registerFont (src, fontFace) {
  // TODO this doesn't need to be on Canvas; it should just be a static method
  // of `bindings`.
  return Canvas._registerFont(fs.realpathSync(src), fontFace)
}

/**
 * Unload all fonts from pango to free up memory
 */
function deregisterAllFonts () {
  return Canvas._deregisterAllFonts()
}

export { Canvas, Context2d as CanvasRenderingContext2D }; // Note: Renamed Context2d to avoid conflict with global object
export { CanvasPattern };
export { Image };
export { ImageData as ImageData }; // Assuming bindings.ImageData is exported elsewhere
export { PNGStream };
export { PDFStream };
export { JPEGStream };
export { DOMMatrix };
export { DOMPoint };

// Functions and properties to export
export { registerFont, deregisterAllFonts, parseFont, createCanvas, createImageData, loadImage, backends, version, cairoVersion, jpegVersion, gifVersion, freetypeVersion, rsvgVersion, pangoVersion };