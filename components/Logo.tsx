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
    <div className={`inline-flex items-center gap-2.5 group select-none ${className}`}>
      {/* Official Master PDFly Stylized "P" Document Emblem */}
      <div
        className={`relative ${iconDim} shrink-0 flex items-center justify-center rounded-xl overflow-hidden shadow-xs transition-transform duration-200 group-hover:scale-105 border border-[#7A1635]/25 dark:border-[#C9A15A]/30 bg-radial from-[#FFFDF9] to-[#F6EFE3] dark:from-[#241D20] dark:to-[#171214] p-0.5`}
        title="PDFly"
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="logoBurgundyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8E1E3F" />
              <stop offset="50%" stopColor="#661029" />
              <stop offset="100%" stopColor="#3D0818" />
            </linearGradient>

            <linearGradient id="logoGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F2DFB5" />
              <stop offset="45%" stopColor="#D4AA5B" />
              <stop offset="100%" stopColor="#946C26" />
            </linearGradient>

            <filter id="subtleDrop" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#2D0613" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* 1. Outer Burgundy "P" Arch and Vertical Spine */}
          <path
            d="M26 15 H56 C73 15 84 25 84 41 C84 57 73 67 56 67 H40 V85 H26 V15 Z"
            fill="url(#logoBurgundyGrad)"
            filter="url(#subtleDrop)"
          />

          {/* 2. Embedded Document Page (Ivory Sheet) */}
          <path
            d="M33 22 H50 L68 39 V60 C68 62 66 64 64 64 H33 V22 Z"
            fill="#FFFDF9"
          />

          {/* Folded Top-Right Corner with Brushed Gold Foil Underbelly */}
          <path
            d="M50 22 L68 39 H54 C52 39 50 37 50 35 V22 Z"
            fill="url(#logoGoldGrad)"
          />

          {/* Document Line Bars in Gold */}
          <rect x="38" y="44" width="18" height="2.5" rx="1.25" fill="url(#logoGoldGrad)" />
          <rect x="38" y="49" width="22" height="2.5" rx="1.25" fill="url(#logoGoldGrad)" />
          <rect x="38" y="54" width="14" height="2.5" rx="1.25" fill="url(#logoGoldGrad)" />

          {/* 3. Dramatic 3D Curled Ribbon Loop at the base */}
          {/* Gold edge/underbelly */}
          <path
            d="M26 73 C34 73 45 69 56 62 C66 56 76 50 84 52 C81 61 71 70 61 73 C50 76 36 77 26 75 Z"
            fill="url(#logoGoldGrad)"
          />
          {/* Burgundy top ribbon loop */}
          <path
            d="M26 69 C35 69 46 64 57 58 C67 52 77 48 83 52 C80 56 73 64 62 69 C51 74 38 75 26 73 Z"
            fill="url(#logoBurgundyGrad)"
          />
          {/* Gold highlight wire */}
          <path
            d="M26 69 C35 69 46 64 57 58 C67 52 77 48 83 52"
            stroke="url(#logoGoldGrad)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
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
