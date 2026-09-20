'use client';

import React from 'react';
import Link from 'next/link';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'compact' | 'icon';
  showTagline?: boolean;
  className?: string;
  href?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'compact',
  showTagline = false,
  className = '',
  href = '/',
}) => {
  // Dimensions for the icon container
  const iconDim =
    size === 'sm'
      ? 'w-7 h-7'
      : size === 'lg'
      ? 'w-10 h-10'
      : size === 'xl'
      ? 'w-14 h-14'
      : 'w-8.5 h-8.5';

  const textSize =
    size === 'sm'
      ? 'text-base'
      : size === 'lg'
      ? 'text-2xl'
      : size === 'xl'
      ? 'text-3xl'
      : 'text-xl';

  const content = (
    <div
      className={`inline-flex items-center gap-2.5 group select-none ${className}`}
      suppressHydrationWarning
    >
      {/* Official Master PDFly Stylized "P" Document Emblem */}
      <div
        className={`relative ${iconDim} shrink-0 flex items-center justify-center rounded-xl overflow-hidden shadow-xs transition-transform duration-200 group-hover:scale-105 border border-[#7A1635]/25 dark:border-[#C9A15A]/30 bg-radial from-[#FFFDF9] to-[#F6EFE3] dark:from-[#241D20] dark:to-[#171214] p-0.5`}
        title="PDFly"
        suppressHydrationWarning
      >
        <svg
          viewBox="158 67 290 390"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          suppressHydrationWarning
        >
          <defs>
            <linearGradient id="navBurgundyMain" x1="20%" y1="10%" x2="85%" y2="90%">
              <stop offset="0%" stopColor="#8B1D40" />
              <stop offset="35%" stopColor="#6E122E" />
              <stop offset="75%" stopColor="#4B091E" />
              <stop offset="100%" stopColor="#2D0411" />
            </linearGradient>

            <linearGradient id="navBurgundyRibbon" x1="0%" y1="20%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#821A3B" />
              <stop offset="50%" stopColor="#641129" />
              <stop offset="100%" stopColor="#3C0717" />
            </linearGradient>

            <linearGradient id="navBurgundyBevel" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9C264B" />
              <stop offset="50%" stopColor="#6E122E" />
              <stop offset="100%" stopColor="#4B091E" />
            </linearGradient>

            <linearGradient id="navGoldFoil" x1="15%" y1="10%" x2="90%" y2="95%">
              <stop offset="0%" stopColor="#F9EBC8" />
              <stop offset="25%" stopColor="#E4C37E" />
              <stop offset="55%" stopColor="#C9A050" />
              <stop offset="80%" stopColor="#AF8436" />
              <stop offset="100%" stopColor="#7B5618" />
            </linearGradient>

            <linearGradient id="navGoldHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF8E7" />
              <stop offset="40%" stopColor="#E8CE92" />
              <stop offset="100%" stopColor="#9D7328" />
            </linearGradient>

            <filter id="navEmblemShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#2B0411" floodOpacity="0.28" />
            </filter>
          </defs>

          {/* Official Master 3D P Document Ribbon Emblem */}
          <g transform="translate(8, 6)" filter="url(#navEmblemShadow)">
            {/* 1. Outer Burgundy P Body */}
            <path
              d="M176 80 H308 C374 80 420 120 420 186 C420 250 374 290 308 290 H236 V432 H176 Z"
              fill="url(#navBurgundyMain)"
            />
            <path d="M176 80 H194 V432 H176 Z" fill="url(#navBurgundyBevel)" opacity="0.65" />

            {/* 2. Embedded Document Page */}
            <path
              d="M204 106 H284 L348 170 V256 C348 266 340 274 330 274 H204 Z"
              fill="#FFFDF9"
            />
            <path
              d="M204 106 H284 L348 170 V256 C348 266 340 274 330 274 H204 Z"
              fill="none"
              stroke="#EAE0D0"
              strokeWidth="2"
            />
            <path d="M284 106 L348 170 H298 C290 170 284 164 284 156 Z" fill="url(#navGoldFoil)" />
            <path d="M284 106 L348 170" stroke="url(#navGoldHighlight)" strokeWidth="3" strokeLinecap="round" />

            {/* Document Text Bars */}
            <rect x="222" y="196" width="76" height="11" rx="5.5" fill="url(#navGoldFoil)" />
            <rect x="222" y="219" width="98" height="11" rx="5.5" fill="url(#navGoldFoil)" />
            <rect x="222" y="242" width="66" height="11" rx="5.5" fill="url(#navGoldFoil)" />

            {/* 3. Lower 3D Ribbon Loop */}
            <path
              d="M176 358 C206 358 248 342 292 318 C332 296 376 274 418 280 C402 320 362 356 316 368 C266 382 214 386 176 378 Z"
              fill="url(#navGoldFoil)"
            />
            <path
              d="M176 334 C218 334 266 312 308 288 C352 264 396 250 422 268 C412 286 388 318 340 340 C288 364 232 370 176 364 Z"
              fill="url(#navBurgundyRibbon)"
            />
            <path
              d="M176 334 C218 334 266 312 308 288 C352 264 396 250 422 268"
              stroke="url(#navGoldHighlight)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M176 378 C214 386 266 382 316 368 C362 356 402 320 418 280"
              stroke="url(#navGoldHighlight)"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.85"
            />
            <path d="M176 358 C168 368 162 376 168 384 C173 389 178 384 176 378 Z" fill="url(#navGoldFoil)" />
          </g>
        </svg>
      </div>

      {/* Official Typography Wordmark & Tagline */}
      {variant !== 'icon' && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center tracking-tight font-extrabold font-sans">
            {/* "PDF" in Deep Burgundy */}
            <span
              className={`${textSize} font-black text-[#7A1635] dark:text-[#F7F1E8] tracking-tight`}
              style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              PDF
            </span>

            {/* "ly" in Gleaming Gold with Wing Flourish */}
            <span className="relative inline-flex items-baseline">
              <span
                className={`${textSize} font-black bg-gradient-to-r from-[#DFBA6E] via-[#C9A15A] to-[#A87B2E] bg-clip-text text-transparent`}
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                ly
              </span>

              {/* Feather Wing Flourish on 'ly' */}
              <svg
                viewBox="0 0 24 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-2.5 -ml-0.5 -mt-2 inline-block text-[#C9A15A]"
              >
                <path
                  d="M1 14 C6 10 14 6 22 2 C18 6 15 10 7 13 Z"
                  fill="currentColor"
                />
                <path
                  d="M6 14 C11 11 17 8 23 5 C19 9 16 12 10 15 Z"
                  fill="currentColor"
                  opacity="0.85"
                />
              </svg>
            </span>
          </div>

          {/* Subtext: Tagline or Local Toolkit */}
          {showTagline ? (
            <span className="text-[8.5px] font-extrabold tracking-[0.18em] text-[#4A0D20] dark:text-[#C9A15A] uppercase mt-0.5">
              PRIVATE. POWERFUL. LOCAL.
            </span>
          ) : (
            <span className="text-[9px] font-bold tracking-wider text-[#7A1635] dark:text-[#C9A15A] uppercase mt-0.5 opacity-90">
              LOCAL TOOLKIT
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        id="pdfly-brand-logo-link"
        className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A1635] rounded-xl"
      >
        {content}
      </Link>
    );
  }

  return content;
};
