const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execSync } = require('child_process');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// -------------------------------------------------------------
// 1. MASTER MARK EMBLEM SVG (The 3D stylized P document ribbon)
// -------------------------------------------------------------
function getEmblemSvgContent({ scale = 1, tx = 0, ty = 0 } = {}) {
  return `
    <g transform="translate(${tx}, ${ty}) scale(${scale})" filter="url(#emblemShadow)">
      <!-- 1. Outer Burgundy P Body (Stem & Arch) -->
      <path d="M176 80 
               H308 
               C374 80 420 120 420 186 
               C420 250 374 290 308 290 
               H236 
               V432 
               H176 
               Z" 
            fill="url(#burgundyPBody)" />

      <!-- Left stem bevel lighting accent -->
      <path d="M176 80 H194 V432 H176 Z" fill="url(#burgundyBevelLight)" opacity="0.65" />

      <!-- 2. Embedded Document Page (Ivory Paper Sheet) -->
      <g filter="url(#docPageShadow)">
        <!-- Paper Sheet -->
        <path d="M204 106 
                 H284 
                 L348 170 
                 V256 
                 C348 266 340 274 330 274 
                 H204 
                 Z" 
              fill="#FFFDF9" />

        <!-- Delicate Paper Edge Border -->
        <path d="M204 106 H284 L348 170 V256 C348 266 340 274 330 274 H204 Z" 
              fill="none" stroke="#EAE0D0" stroke-width="1.5" />

        <!-- Folded Top-Right Corner with Gold Foil Underbelly -->
        <g filter="url(#cornerFoldShadow)">
          <path d="M284 106 L348 170 H298 C290 170 284 164 284 156 Z" fill="url(#goldFoil)" />
          <path d="M284 106 L348 170" stroke="url(#goldSpecularHighlight)" stroke-width="2.5" stroke-linecap="round" />
        </g>

        <!-- Document Text Bars in Embossed Polished Gold -->
        <rect x="222" y="196" width="76" height="9.5" rx="4.75" fill="url(#goldFoil)" />
        <rect x="222" y="219" width="98" height="9.5" rx="4.75" fill="url(#goldFoil)" />
        <rect x="222" y="242" width="66" height="9.5" rx="4.75" fill="url(#goldFoil)" />
      </g>

      <!-- 3. Lower 3D Ribbon Flourish (The Signature Curled Ribbon Loop) -->
      <!-- Gold Ribbon Underside / Inner Curl -->
      <path d="M176 358 
               C206 358 248 342 292 318 
               C332 296 376 274 418 280 
               C402 320 362 356 316 368 
               C266 382 214 386 176 378 
               Z" 
            fill="url(#goldFoil)" />

      <!-- Burgundy Ribbon Outer Front Face -->
      <path d="M176 334 
               C218 334 266 312 308 288 
               C352 264 396 250 422 268 
               C412 286 388 318 340 340 
               C288 364 232 370 176 364 
               Z" 
            fill="url(#burgundyRibbon)" />

      <!-- Specular Gold Edge Trim Lines on Ribbon -->
      <path d="M176 334 C218 334 266 312 308 288 C352 264 396 250 422 268" 
            stroke="url(#goldSpecularHighlight)" stroke-width="3.5" stroke-linecap="round" />
      <path d="M176 378 C214 386 266 382 316 368 C362 356 402 320 418 280" 
            stroke="url(#goldSpecularHighlight)" stroke-width="2" stroke-linecap="round" opacity="0.85" />

      <!-- Stem wrap flourish fold at bottom-left -->
      <path d="M176 358 C168 368 162 376 168 384 C173 389 178 384 176 378 Z" fill="url(#goldFoil)" />
    </g>
  `;
}

// -------------------------------------------------------------
// COMMON GRADIENTS & FILTERS DEFS
// -------------------------------------------------------------
const commonDefs = `
  <defs>
    <!-- Background Radiance Gradient -->
    <radialGradient id="bgRadiance" cx="48%" cy="46%" r="68%">
      <stop offset="0%" stop-color="#FFFDF9" />
      <stop offset="65%" stop-color="#F7EFE3" />
      <stop offset="100%" stop-color="#ECE0CD" />
    </radialGradient>

    <!-- Deep Luxury Burgundy Gradients -->
    <linearGradient id="burgundyPBody" x1="20%" y1="10%" x2="85%" y2="90%">
      <stop offset="0%" stop-color="#8B1D40" />
      <stop offset="35%" stop-color="#6E122E" />
      <stop offset="75%" stop-color="#4B091E" />
      <stop offset="100%" stop-color="#2D0411" />
    </linearGradient>

    <linearGradient id="burgundyRibbon" x1="0%" y1="20%" x2="100%" y2="80%">
      <stop offset="0%" stop-color="#821A3B" />
      <stop offset="50%" stop-color="#641129" />
      <stop offset="100%" stop-color="#3C0717" />
    </linearGradient>

    <linearGradient id="burgundyBevelLight" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#9C264B" />
      <stop offset="50%" stop-color="#6E122E" />
      <stop offset="100%" stop-color="#4B091E" />
    </linearGradient>

    <!-- Metallic Brushed Gold Foil Gradients -->
    <linearGradient id="goldFoil" x1="15%" y1="10%" x2="90%" y2="95%">
      <stop offset="0%" stop-color="#F9EBC8" />
      <stop offset="25%" stop-color="#E4C37E" />
      <stop offset="55%" stop-color="#C9A050" />
      <stop offset="80%" stop-color="#AF8436" />
      <stop offset="100%" stop-color="#7B5618" />
    </linearGradient>

    <linearGradient id="goldSpecularHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF8E7" />
      <stop offset="40%" stop-color="#E8CE92" />
      <stop offset="100%" stop-color="#9D7328" />
    </linearGradient>

    <!-- Drop Shadows -->
    <filter id="emblemShadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#2B0411" flood-opacity="0.32" />
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.16" />
    </filter>

    <filter id="docPageShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="3" dy="6" stdDeviation="7" flood-color="#2C0512" flood-opacity="0.22" />
    </filter>

    <filter id="cornerFoldShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="-3" dy="4" stdDeviation="5" flood-color="#1F030B" flood-opacity="0.35" />
    </filter>
    
    <filter id="textDropShadow">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#2D0613" flood-opacity="0.22" />
    </filter>
  </defs>
`;

// -------------------------------------------------------------
// 2. SVG VARIANTS
// -------------------------------------------------------------

// A. Standard App Icon SVG (512x512 with squircle canvas & optical centering)
const iconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${commonDefs}
  <!-- Squircle canvas with luxury warm rim -->
  <rect width="512" height="512" rx="112" fill="url(#bgRadiance)" />
  <rect x="1.5" y="1.5" width="509" height="509" rx="110.5" fill="none" stroke="#C9A050" stroke-width="2" stroke-opacity="0.25" />

  ${getEmblemSvgContent({ scale: 1.05, tx: -54, ty: -13 })}
</svg>`;

// B. Maskable App Icon SVG (Full bleed 512x512 background, emblem scaled to fit 80% safe circle)
const maskableIconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${commonDefs}
  <!-- Full bleed background covering 100% of the canvas -->
  <rect width="512" height="512" fill="url(#bgRadiance)" />
  
  <!-- Subtle corner decorative flourish from official poster -->
  <path d="M0 0 L100 0 C50 0 0 50 0 100 Z" fill="#4B091E" opacity="0.15" />
  <path d="M512 512 L412 512 C462 512 512 462 512 412 Z" fill="#4B091E" opacity="0.15" />

  <!-- Emblem scaled to ~0.90 to sit comfortably within the 80% safe zone circle (diameter 409px) -->
  ${getEmblemSvgContent({ scale: 0.90, tx: -10, ty: 26 })}
</svg>`;

// C. Standalone Transparent Mark SVG
const markOnlySvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${commonDefs}
  ${getEmblemSvgContent({ scale: 1.05, tx: -54, ty: -13 })}
</svg>`;

// D. Full Official Brand Logo Artwork SVG (Mark + Wordmark + Tagline + Shield Rule)
const logoFullSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="480" viewBox="0 0 800 480" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${commonDefs}

  <!-- Luxury poster canvas -->
  <rect width="800" height="480" fill="url(#bgRadiance)" />

  <!-- Top-left deep burgundy corner leather trim with gold piping border -->
  <path d="M0 0 L120 0 C60 0 0 60 0 120 Z" fill="#4B091E" />
  <path d="M120 0 L0 120" stroke="url(#goldFoil)" stroke-width="3.5" />

  <!-- Bottom-right deep burgundy corner leather trim with gold piping border -->
  <path d="M800 480 L680 480 C740 480 800 420 800 360 Z" fill="#4B091E" />
  <path d="M680 480 L800 360" stroke="url(#goldFoil)" stroke-width="3.5" />

  <!-- Top Right Micro Copy -->
  <text x="740" y="42" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="700" letter-spacing="3" fill="#AF8436">READ • EDIT • CONVERT • PROTECT</text>

  <!-- Bottom Left Micro Copy -->
  <text x="60" y="446" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="700" letter-spacing="3" fill="#AF8436">FAST • SECURE • OFFLINE • FOR EVERYONE</text>

  <!-- Central 3D P Emblem -->
  ${getEmblemSvgContent({ scale: 0.52, tx: 247, ty: 22 })}

  <!-- Central Wordmark -->
  <g transform="translate(400, 332)" text-anchor="middle" filter="url(#textDropShadow)">
    <text font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="76" letter-spacing="-1">
      <tspan fill="url(#burgundyPBody)">PDF</tspan>
      <tspan fill="url(#goldFoil)">ly</tspan>
    </text>
    
    <!-- Wing Feathers Flourish on 'ly' -->
    <path d="M72 -54 C92 -66 116 -76 130 -80 C120 -68 108 -58 84 -50 Z" fill="url(#goldFoil)" />
    <path d="M86 -44 C104 -54 122 -62 136 -64 C124 -54 112 -46 94 -40 Z" fill="url(#goldFoil)" />
  </g>

  <!-- Tagline: PRIVATE. POWERFUL. LOCAL. -->
  <text x="400" y="388" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="17" font-weight="800" letter-spacing="6" fill="#4B091E">
    PRIVATE. POWERFUL. LOCAL.
  </text>

  <!-- Gold Rule with Shield Padlock -->
  <g transform="translate(400, 416)">
    <line x1="-160" y1="0" x2="-22" y2="0" stroke="url(#goldFoil)" stroke-width="1.5" />
    <line x1="22" y1="0" x2="160" y2="0" stroke="url(#goldFoil)" stroke-width="1.5" />
    <!-- Shield -->
    <path d="M0 -12 L12 -6 V4 C12 11 0 16 0 16 C0 16 -12 11 -12 4 V-6 Z" fill="none" stroke="url(#goldFoil)" stroke-width="1.8" />
    <!-- Padlock inside shield -->
    <rect x="-3.5" y="-1" width="7" height="6" rx="1" fill="url(#goldFoil)" />
    <path d="M-2.5 -1 V-3.5 C-2.5 -4.8 2.5 -4.8 2.5 -3.5 V-1" fill="none" stroke="url(#goldFoil)" stroke-width="1.2" />
  </g>
</svg>`;

// E. OpenGraph 1200x630 Social Share Image SVG
const ogImageSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${commonDefs}

  <!-- Canvas -->
  <rect width="1200" height="630" fill="url(#bgRadiance)" />

  <!-- Corner luxury trims -->
  <path d="M0 0 L160 0 C80 0 0 80 0 160 Z" fill="#4B091E" />
  <path d="M160 0 L0 160" stroke="url(#goldFoil)" stroke-width="4.5" />

  <path d="M1200 630 L1040 630 C1120 630 1200 550 1200 470 Z" fill="#4B091E" />
  <path d="M1040 630 L1200 470" stroke="url(#goldFoil)" stroke-width="4.5" />

  <!-- Central Mark & Wordmark -->
  ${getEmblemSvgContent({ scale: 0.62, tx: 417, ty: 40 })}

  <g transform="translate(600, 420)" text-anchor="middle" filter="url(#textDropShadow)">
    <text font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="88" letter-spacing="-1">
      <tspan fill="url(#burgundyPBody)">PDF</tspan>
      <tspan fill="url(#goldFoil)">ly</tspan>
    </text>
    <path d="M84 -62 C108 -76 135 -88 152 -92 C140 -78 126 -66 98 -58 Z" fill="url(#goldFoil)" />
    <path d="M100 -50 C122 -62 142 -72 158 -74 C144 -62 130 -52 110 -46 Z" fill="url(#goldFoil)" />
  </g>

  <!-- Tagline -->
  <text x="600" y="482" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="800" letter-spacing="7" fill="#4B091E">
    PRIVATE. POWERFUL. LOCAL.
  </text>

  <!-- Security line -->
  <g transform="translate(600, 516)">
    <line x1="-180" y1="0" x2="-24" y2="0" stroke="url(#goldFoil)" stroke-width="1.8" />
    <line x1="24" y1="0" x2="180" y2="0" stroke="url(#goldFoil)" stroke-width="1.8" />
    <path d="M0 -14 L14 -7 V5 C14 13 0 18 0 18 C0 18 -14 13 -14 5 V-7 Z" fill="none" stroke="url(#goldFoil)" stroke-width="2" />
    <rect x="-4" y="-1" width="8" height="7" rx="1" fill="url(#goldFoil)" />
    <path d="M-3 -1 V-4 C-3 -5.5 3 -5.5 3 -4 V-1" fill="none" stroke="url(#goldFoil)" stroke-width="1.4" />
  </g>

  <!-- Value propositions -->
  <text x="600" y="568" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#7B5618">
    100% In-Browser Processing • Zero Cloud Uploads • Offline PWA
  </text>
</svg>`;

async function generateAll() {
  console.log('Writing SVGs to public directory...');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon.svg'), iconSvg);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'logo-full.svg'), logoFullSvg);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'pdfly-mark.svg'), markOnlySvg);

  console.log('Generating PNG assets via sharp...');

  // 1. 512x512 PWA Icon
  await sharp(Buffer.from(iconSvg))
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(PUBLIC_DIR, 'pwa-512x512.png'));
  fs.copyFileSync(path.join(PUBLIC_DIR, 'pwa-512x512.png'), path.join(ICONS_DIR, 'icon-512.png'));

  // 2. 192x192 PWA Icon
  await sharp(Buffer.from(iconSvg))
    .resize(192, 192)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(PUBLIC_DIR, 'pwa-192x192.png'));
  fs.copyFileSync(path.join(PUBLIC_DIR, 'pwa-192x192.png'), path.join(ICONS_DIR, 'icon-192.png'));

  // 3. 512x512 Maskable PWA Icon
  await sharp(Buffer.from(maskableIconSvg))
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(PUBLIC_DIR, 'pwa-maskable-512x512.png'));
  fs.copyFileSync(path.join(PUBLIC_DIR, 'pwa-maskable-512x512.png'), path.join(ICONS_DIR, 'icon-512-maskable.png'));

  // 3b. 192x192 Maskable PWA Icon
  await sharp(Buffer.from(maskableIconSvg))
    .resize(192, 192)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(PUBLIC_DIR, 'pwa-maskable-192x192.png'));
  fs.copyFileSync(path.join(PUBLIC_DIR, 'pwa-maskable-192x192.png'), path.join(ICONS_DIR, 'icon-192-maskable.png'));

  // 4. 180x180 Apple Touch Icon
  await sharp(Buffer.from(iconSvg))
    .resize(180, 180)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));

  // 5. Standalone mark PNG
  await sharp(Buffer.from(markOnlySvg))
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(PUBLIC_DIR, 'pdfly-mark.png'));

  // 6. Full Logo PNG
  await sharp(Buffer.from(logoFullSvg))
    .resize(800, 480)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(PUBLIC_DIR, 'pdfly-logo.png'));

  // 7. OpenGraph Image 1200x630 PNG
  await sharp(Buffer.from(ogImageSvg))
    .resize(1200, 630)
    .png({ quality: 95, compressionLevel: 8 })
    .toFile(path.join(PUBLIC_DIR, 'og-image.png'));

  // 8. Favicon generation: 16x16, 32x32, 48x48 PNGs and multi-res favicon.ico
  const fav48Path = '/tmp/fav-48.png';
  const fav32Path = '/tmp/fav-32.png';
  const fav16Path = '/tmp/fav-16.png';

  await sharp(Buffer.from(iconSvg)).resize(48, 48).png().toFile(fav48Path);
  await sharp(Buffer.from(iconSvg)).resize(32, 32).png().toFile(fav32Path);
  await sharp(Buffer.from(iconSvg)).resize(16, 16).png().toFile(fav16Path);

  // Also create favicon.png (32x32)
  fs.copyFileSync(fav32Path, path.join(PUBLIC_DIR, 'favicon.png'));

  // Create favicon.ico with ImageMagick convert
  try {
    execSync(`convert ${fav16Path} ${fav32Path} ${fav48Path} ${path.join(PUBLIC_DIR, 'favicon.ico')}`);
    console.log('favicon.ico generated successfully with multiple resolutions');
  } catch (e) {
    console.warn('convert failed, using 48px png as fallback favicon.ico:', e.message);
    fs.copyFileSync(fav48Path, path.join(PUBLIC_DIR, 'favicon.ico'));
  }

  console.log('All brand assets generated successfully!');
}

generateAll().catch(err => {
  console.error('Failed to generate brand assets:', err);
  process.exit(1);
});
