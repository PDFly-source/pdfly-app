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
      {/* Official PDFly Logo Emblem (new approved brand mark) */}
      <div
        className={`relative ${iconDim} shrink-0 flex items-center justify-center rounded-xl overflow-hidden shadow-xs transition-transform duration-200 group-hover:scale-105 border border-[#7A1635]/25 dark:border-[#C9A15A]/30 bg-radial from-[#FFFDF9] to-[#F6EFE3] dark:from-[#241D20] dark:to-[#171214] p-0.5`}
        title="PDFly"
        suppressHydrationWarning
      >
        <img
          src="/pdfly-mark.svg"
          alt="PDFly"
          className="w-full h-full object-contain"
          draggable={false}
        />
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
