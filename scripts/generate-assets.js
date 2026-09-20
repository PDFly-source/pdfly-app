import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Master SVG representation of the official PDFly Logo Emblem
// High precision matching the user's uploaded master logo
const emblemSvg = (size = 512, withBackground = true, bgColor = '#F6EFE3') => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background subtle gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FCF8F2" />
      <stop offset="100%" stop-color="#F2E8DA" />
    </radialGradient>

    <!-- Burgundy Gradients -->
    <linearGradient id="burgundyDeep" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8F1D40" />
      <stop offset="45%" stop-color="#6E132E" />
      <stop offset="100%" stop-color="#3D0818" />
    </linearGradient>

    <linearGradient id="burgundyBack" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#7A1635" />
      <stop offset="100%" stop-color="#4A0D20" />
    </linearGradient>

    <!-- Gold Foil Gradients -->
    <linearGradient id="goldFoil" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EED8A1" />
      <stop offset="35%" stop-color="#D4AA5B" />
      <stop offset="70%" stop-color="#BE9343" />
      <stop offset="100%" stop-color="#8E6723" />
    </linearGradient>

    <linearGradient id="goldFoilLight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFF2D4" />
      <stop offset="50%" stop-color="#DFC17E" />
      <stop offset="100%" stop-color="#A57D33" />
    </linearGradient>

    <!-- Soft Drop Shadow -->
    <filter id="masterShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#2D0613" flood-opacity="0.32" />
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.18" />
    </filter>

    <filter id="pageShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="3" dy="6" stdDeviation="7" flood-color="#3D0818" flood-opacity="0.25" />
    </filter>
  </defs>

  ${withBackground ? `
  <!-- Canvas Card Background -->
  <rect width="512" height="512" rx="100" fill="url(#bgGrad)" />

  <!-- Corner luxury burgundy folded accents with gold trim -->
  <!-- Top Left Corner -->
  <path d="M0 0 L110 0 C60 0 0 60 0 110 Z" fill="#4A0D20" />
  <path d="M110 0 L0 110" stroke="url(#goldFoil)" stroke-width="4" stroke-linecap="round" />
  <path d="M118 0 L0 118" stroke="url(#goldFoil)" stroke-width="1.5" stroke-opacity="0.6" />

  <!-- Bottom Right Corner -->
  <path d="M512 512 L402 512 C452 512 512 452 512 402 Z" fill="#4A0D20" />
  <path d="M402 512 L512 402" stroke="url(#goldFoil)" stroke-width="4" stroke-linecap="round" />
  <path d="M394 512 L512 394" stroke="url(#goldFoil)" stroke-width="1.5" stroke-opacity="0.6" />
  ` : ''}

  <!-- Master Stylized P Document Ribbon Emblem -->
  <g filter="url(#masterShadow)">
    <!-- 1. Outer Burgundy P Letter Arch -->
    <path d="M178 78 
             H306 
             C372 78 418 118 418 184 
             C418 248 372 288 306 288 
             H238 
             V434 
             H178 
             Z" 
          fill="url(#burgundyDeep)" />

    <!-- 2. Embedded Document Sheet -->
    <g filter="url(#pageShadow)">
      <!-- Sheet Body -->
      <path d="M206 104 
               H280 
               L348 172 
               V256 
               C348 266 340 274 330 274 
               H206 
               Z" 
            fill="#FFFDF9" />

      <!-- Folded Top-Right Corner with Gold Foil Underbelly -->
      <path d="M280 104 L348 172 H296 C287 172 280 165 280 156 Z" fill="url(#goldFoil)" />

      <!-- Document Line Bars (Gold) -->
      <rect x="224" y="196" width="76" height="9" rx="4.5" fill="url(#goldFoil)" />
      <rect x="224" y="218" width="94" height="9" rx="4.5" fill="url(#goldFoil)" />
      <rect x="224" y="240" width="60" height="9" rx="4.5" fill="url(#goldFoil)" />
    </g>

    <!-- 3. Lower 3D Ribbon Flourish (Curl looping at the base) -->
    <!-- Gold Underbelly of Ribbon -->
    <path d="M178 356 
             C206 356 248 340 292 316 
             C332 294 374 274 416 280 
             C400 318 360 354 316 366 
             C268 380 216 384 178 376 
             Z" 
          fill="url(#goldFoil)" />

    <!-- Burgundy Ribbon Surface Front -->
    <path d="M178 334 
             C218 334 266 312 308 288 
             C352 264 394 250 422 268 
             C412 284 388 316 340 338 
             C288 362 232 368 178 362 
             Z" 
          fill="url(#burgundyDeep)" />

    <!-- Gold Edge Trim Ribbon Highlight -->
    <path d="M178 334 C218 334 266 312 308 288 C352 264 394 250 422 268" 
          stroke="url(#goldFoilLight)" stroke-width="4" stroke-linecap="round" />
  </g>
</svg>
`;

// Full Logo with Wordmark & Tagline
const fullLogoSvg = (width = 800, height = 450) => `
<svg width="${width}" height="${height}" viewBox="0 0 800 450" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fullBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCF8F2" />
      <stop offset="100%" stop-color="#F2E8DA" />
    </linearGradient>

    <linearGradient id="bText" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#8F1D40" />
      <stop offset="100%" stop-color="#4A0D20" />
    </linearGradient>

    <linearGradient id="gText" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F0DCAB" />
      <stop offset="40%" stop-color="#D4AA5B" />
      <stop offset="100%" stop-color="#9A7029" />
    </linearGradient>

    <filter id="textShadow">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#3D0818" flood-opacity="0.18" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="800" height="450" fill="url(#fullBg)" />

  <!-- Corner luxury trims -->
  <path d="M0 0 L90 0 C45 0 0 45 0 90 Z" fill="#4A0D20" />
  <path d="M90 0 L0 90" stroke="url(#gText)" stroke-width="3" />
  <path d="M800 450 L710 450 C755 450 800 405 800 360 Z" fill="#4A0D20" />
  <path d="M710 450 L800 360" stroke="url(#gText)" stroke-width="3" />

  <!-- Top Right Micro Copy -->
  <text x="730" y="38" text-anchor="end" font-family="system-ui, sans-serif" font-size="10" font-weight="700" letter-spacing="3" fill="#A57D33">READ • EDIT • CONVERT • PROTECT</text>

  <!-- Bottom Left Micro Copy -->
  <text x="70" y="420" font-family="system-ui, sans-serif" font-size="10" font-weight="700" letter-spacing="3" fill="#A57D33">FAST • SECURE • OFFLINE • FOR EVERYONE</text>

  <!-- Center Group -->
  <g transform="translate(260, 20)">
    <!-- Emblem scaled -->
    <g transform="scale(0.55)">
      <!-- Outer Burgundy P Letter Arch -->
      <path d="M178 78 H306 C372 78 418 118 418 184 C418 248 372 288 306 288 H238 V434 H178 Z" fill="url(#bText)" />
      <!-- Embedded Document Sheet -->
      <path d="M206 104 H280 L348 172 V256 C348 266 340 274 330 274 H206 Z" fill="#FFFDF9" />
      <path d="M280 104 L348 172 H296 C287 172 280 165 280 156 Z" fill="url(#gText)" />
      <rect x="224" y="196" width="76" height="9" rx="4.5" fill="url(#gText)" />
      <rect x="224" y="218" width="94" height="9" rx="4.5" fill="url(#gText)" />
      <rect x="224" y="240" width="60" height="9" rx="4.5" fill="url(#gText)" />
      <!-- Ribbon Loop -->
      <path d="M178 356 C206 356 248 340 292 316 C332 294 374 274 416 280 C400 318 360 354 316 366 C268 380 216 384 178 376 Z" fill="url(#gText)" />
      <path d="M178 334 C218 334 266 312 308 288 C352 264 394 250 422 268 C412 284 388 316 340 338 C288 362 232 368 178 362 Z" fill="url(#bText)" />
    </g>
  </g>

  <!-- Central Wordmark -->
  <g transform="translate(400, 310)" text-anchor="middle" filter="url(#textShadow)">
    <text font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="76" letter-spacing="-1">
      <tspan fill="url(#bText)">PDF</tspan>
      <tspan fill="url(#gText)">ly</tspan>
    </text>
    
    <!-- Wing Feathers Flourish on 'ly' -->
    <path d="M72 -54 C92 -66 116 -76 130 -80 C120 -68 108 -58 84 -50 Z" fill="url(#gText)" />
    <path d="M86 -44 C104 -54 122 -62 136 -64 C124 -54 112 -46 94 -40 Z" fill="url(#gText)" />
  </g>

  <!-- Tagline: PRIVATE. POWERFUL. LOCAL. -->
  <text x="400" y="365" text-anchor="middle" font-family="system-ui, sans-serif" font-size="17" font-weight="800" letter-spacing="6" fill="#4A0D20">
    PRIVATE. POWERFUL. LOCAL.
  </text>

  <!-- Gold Rule with Shield Padlock -->
  <g transform="translate(400, 392)">
    <line x1="-160" y1="0" x2="-22" y2="0" stroke="url(#gText)" stroke-width="1.5" />
    <line x1="22" y1="0" x2="160" y2="0" stroke="url(#gText)" stroke-width="1.5" />
    <!-- Shield -->
    <path d="M0 -12 L12 -6 V4 C12 11 0 16 0 16 C0 16 -12 11 -12 4 V-6 Z" fill="none" stroke="url(#gText)" stroke-width="1.8" />
    <!-- Padlock inside shield -->
    <rect x="-3.5" y="-1" width="7" height="6" rx="1" fill="url(#gText)" />
    <path d="M-2.5 -1 V-3.5 C-2.5 -4.8 2.5 -4.8 2.5 -3.5 V-1" fill="none" stroke="url(#gText)" stroke-width="1.2" />
  </g>
</svg>
`;

// Social Card (1200x630) OpenGraph
const ogSvg = (width = 1200, height = 630) => `
<svg width="${width}" height="${height}" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ogBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#191416" />
      <stop offset="50%" stop-color="#121012" />
      <stop offset="100%" stop-color="#241018" />
    </linearGradient>

    <radialGradient id="ogGlow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#7A1635" stop-opacity="0.45" />
      <stop offset="60%" stop-color="#C9A15A" stop-opacity="0.1" />
      <stop offset="100%" stop-color="transparent" />
    </radialGradient>

    <linearGradient id="ogBurgundy" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9E2248" />
      <stop offset="100%" stop-color="#601026" />
    </linearGradient>

    <linearGradient id="ogGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F2E0B5" />
      <stop offset="50%" stop-color="#D4AA5B" />
      <stop offset="100%" stop-color="#9A7029" />
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#ogBg)" />
  <rect width="1200" height="630" fill="url(#ogGlow)" />

  <!-- Outer frame -->
  <rect x="24" y="24" width="1152" height="582" rx="28" fill="none" stroke="#3D2930" stroke-width="2" />

  <!-- Center Logo Group -->
  <g transform="translate(600, 190)">
    <!-- Scaled Emblem -->
    <g transform="translate(-85, -135) scale(0.65)">
      <path d="M178 78 H306 C372 78 418 118 418 184 C418 248 372 288 306 288 H238 V434 H178 Z" fill="url(#ogBurgundy)" />
      <path d="M206 104 H280 L348 172 V256 C348 266 340 274 330 274 H206 Z" fill="#FFFDF9" />
      <path d="M280 104 L348 172 H296 C287 172 280 165 280 156 Z" fill="url(#ogGold)" />
      <rect x="224" y="196" width="76" height="9" rx="4.5" fill="url(#ogGold)" />
      <rect x="224" y="218" width="94" height="9" rx="4.5" fill="url(#ogGold)" />
      <rect x="224" y="240" width="60" height="9" rx="4.5" fill="url(#ogGold)" />
      <path d="M178 356 C206 356 248 340 292 316 C332 294 374 274 416 280 C400 318 360 354 316 366 C268 380 216 384 178 376 Z" fill="url(#ogGold)" />
      <path d="M178 334 C218 334 266 312 308 288 C352 264 394 250 422 268 C412 284 388 316 340 338 C288 362 232 368 178 362 Z" fill="url(#ogBurgundy)" />
    </g>

    <!-- Wordmark -->
    <text y="150" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="96" letter-spacing="-2">
      <tspan fill="#F7F1E8">PDF</tspan>
      <tspan fill="url(#ogGold)">ly</tspan>
    </text>

    <!-- Wing Flourish -->
    <path d="M96 82 C122 66 150 54 168 50 C154 64 140 76 110 86 Z" fill="url(#ogGold)" />
    <path d="M112 94 C134 82 158 72 174 70 C160 82 144 92 122 100 Z" fill="url(#ogGold)" />

    <!-- Tagline -->
    <text y="220" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="800" letter-spacing="8" fill="url(#ogGold)">
      PRIVATE • POWERFUL • LOCAL
    </text>

    <!-- Subtitle -->
    <text y="270" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="500" fill="#AFA6A8">
      A private, local-first PDF workspace that processes your documents in your browser.
    </text>
  </g>
</svg>
`;

async function main() {
  const publicDir = path.resolve('./public');

  console.log('Generating PDFly master brand assets...');

  // 1. Standalone icon.svg
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), emblemSvg(512, false));

  // 2. Full logo SVG
  fs.writeFileSync(path.join(publicDir, 'logo-full.svg'), fullLogoSvg(800, 450));

  // 3. Render PNGs with sharp
  // apple-touch-icon: 180x180 with warm cream rounded background
  await sharp(Buffer.from(emblemSvg(512, true)))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // pwa-192x192
  await sharp(Buffer.from(emblemSvg(512, true)))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // pwa-512x512
  await sharp(Buffer.from(emblemSvg(512, true)))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // pwa-maskable-512x512 (with extra padding)
  const maskableSvg = emblemSvg(512, true);
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // favicon (32x32)
  await sharp(Buffer.from(emblemSvg(256, true)))
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  // Master logo PNG
  await sharp(Buffer.from(fullLogoSvg(800, 450)))
    .png()
    .toFile(path.join(publicDir, 'pdfly-logo.png'));

  // Master emblem PNG
  await sharp(Buffer.from(emblemSvg(512, false)))
    .png()
    .toFile(path.join(publicDir, 'pdfly-mark.png'));

  // OpenGraph social image
  await sharp(Buffer.from(ogSvg(1200, 630)))
    .png()
    .toFile(path.join(publicDir, 'og-image.png'));

  console.log('All PDFly brand assets successfully generated!');
}

main().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
