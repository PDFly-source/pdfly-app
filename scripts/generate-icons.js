import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Minimal pure-Node PNG generator using zlib
function createPng(width, height, getPixelRGBA) {
  // Raw image data with filter byte (0 = none) at start of each scanline
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRGBA(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // Helper to make PNG chunk
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const crcPayload = Buffer.concat([typeBuf, data]);

    // CRC32 calculation
    let c;
    const crcTable = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crcTable[n] = c;
    }
    let crc = 0 ^ (-1);
    for (let i = 0; i < crcPayload.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ crcPayload[i]) & 0xff];
    }
    crc = (crc ^ (-1)) >>> 0;

    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);

    return Buffer.concat([len, crcPayload, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Brand color palette:
// Primary: #6D1F35 -> rgb(109, 31, 53)
// Accent: #C6A15B -> rgb(198, 161, 91)
// Background: #F7F3EC -> rgb(247, 243, 236)
// White: rgb(255, 255, 255)

function drawIconPixel(x, y, w, h, isMaskable = false) {
  const nx = x / w; // 0 to 1
  const ny = y / h;

  // Background
  const bgR = 109, bgG = 31, bgB = 53; // #6D1F35

  // Scale inside bounding box
  const pad = isMaskable ? 0.22 : 0.14;
  const sx = (nx - pad) / (1 - 2 * pad);
  const sy = (ny - pad) / (1 - 2 * pad);

  if (sx < 0 || sx > 1 || sy < 0 || sy > 1) {
    return [bgR, bgG, bgB, 255];
  }

  // Draw Document / "P" symbol:
  // Document base rectangle: sx in [0.15, 0.85], sy in [0.08, 0.92]
  // Corner fold at top right: x > 0.60, y < 0.32
  const docLeft = 0.18;
  const docRight = 0.82;
  const docTop = 0.10;
  const docBottom = 0.90;
  const foldSize = 0.22;

  // Check if inside folded corner triangle
  const inFoldCutout = (sx > docRight - foldSize) && (sy < docTop + foldSize) && ((sx - (docRight - foldSize)) + (docTop + foldSize - sy) > foldSize);

  const inDoc = (sx >= docLeft && sx <= docRight && sy >= docTop && sy <= docBottom) && !inFoldCutout;

  // Fold flap:
  const inFoldFlap = (sx > docRight - foldSize) && (sy < docTop + foldSize) && !inFoldCutout && (sx <= docRight && sy >= docTop);

  if (inFoldFlap) {
    // Accent gold fold
    return [198, 161, 91, 255];
  }

  if (inDoc) {
    // Stylized "P" inside document
    // P stem: x in [0.32, 0.44], y in [0.26, 0.76]
    // P loop: x in [0.44, 0.68], y in [0.26, 0.53] with hollow center
    const inStem = (sx >= 0.32 && sx <= 0.44 && sy >= 0.26 && sy <= 0.76);
    
    // Outer loop
    const dx = (sx - 0.44) / 0.24;
    const dy = (sy - 0.395) / 0.135;
    const distSq = dx * dx + dy * dy;
    const inOuterLoop = (sx >= 0.40 && distSq <= 1.0 && sy >= 0.26 && sy <= 0.53);

    // Inner loop hole
    const idx = (sx - 0.44) / 0.14;
    const idy = (sy - 0.395) / 0.065;
    const inInnerLoop = (sx >= 0.44 && (idx * idx + idy * idy) < 0.9);

    const inP = (inStem || (inOuterLoop && !inInnerLoop));

    // Accent line at bottom of document
    const inAccentLine = (sx >= 0.32 && sx <= 0.68 && sy >= 0.68 && sy <= 0.72);

    if (inP) {
      // Burgundy letter inside white doc
      return [109, 31, 53, 255];
    }
    if (inAccentLine) {
      return [198, 161, 91, 255];
    }
    // White document body
    return [247, 243, 236, 255];
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192
const png192 = createPng(192, 192, (x, y, w, h) => drawIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

// Generate 512x512
const png512 = createPng(512, 512, (x, y, w, h) => drawIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

// Generate maskable 512x512
const pngMaskable = createPng(512, 512, (x, y, w, h) => drawIconPixel(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskable);

// Apple touch icon (180x180)
const appleIcon = createPng(180, 180, (x, y, w, h) => drawIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

// Favicon 32x32
const favicon32 = createPng(32, 32, (x, y, w, h) => drawIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favicon32);

// SVG Vector Icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="112" fill="#6D1F35" />
  <!-- Document base with folded corner -->
  <path d="M128 96 H320 L400 176 V416 H128 Z" fill="#F7F3EC" />
  <!-- Corner fold shadow & flap -->
  <path d="M320 96 V176 H400 Z" fill="#C6A15B" />
  <!-- Minimalist P Letterform -->
  <path d="M184 176 H288 C324 176 352 198 352 236 C352 274 324 296 288 296 H236 V352 H184 V176 Z M236 220 V252 H284 C298 252 306 244 306 236 C306 228 298 220 284 220 H236 Z" fill="#6D1F35" />
  <!-- Accent security document notch -->
  <rect x="236" y="324" width="92" height="12" rx="6" fill="#C6A15B" />
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

console.log('Icons generated successfully.');
