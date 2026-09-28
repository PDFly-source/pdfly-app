import React from 'react';
import { ArrowRight, Layers } from 'lucide-react';

/**
 * AppMintly ecosystem discovery banner (PDFMiniFly → AppMintly).
 *
 * A premium, in-house promotional card introducing AppMintly — the
 * developer's app marketplace — on the PDFMiniFly homepage.
 *
 * Purely static markup: no analytics, no tracking, no external
 * requests. The only outbound action is the explicit user click on
 * the CTA, which navigates (same tab) to https://appmintly.pages.dev/.
 */
const APPMINTLY_URL = 'https://appmintly.pages.dev/';

export const AppMintlyBanner: React.FC = () => (
  <section
    aria-label="AppMintly ecosystem"
    className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
  >
    <div className="relative overflow-hidden rounded-[22px] bg-[#171416] dark:bg-[#221C1E] border border-[#C9A15A]/20 dark:border-[#C9A15A]/15 shadow-xs">
      {/* Soft ambient glows: emerald ecosystem accent + restrained gold */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-[#16A765]/12 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-14 h-64 w-64 rounded-full bg-[#C9A15A]/10 blur-3xl"
      />

      <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
        <div className="flex-1 min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#C9A15A] mb-2">
            <Layers className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              <span aria-hidden="true">✦ </span>Part of the AppMintly Ecosystem
            </span>
          </p>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-[#F7F1E8] leading-snug">
            Discover More. Beyond PDF.
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-white/65 leading-relaxed max-w-xl">
            Explore apps, tools, PWAs and digital utilities crafted by the same developer — all in one place.
          </p>
        </div>

        <div className="shrink-0 flex flex-col items-start sm:items-end gap-2">
          <a
            href={APPMINTLY_URL}
            aria-label="Explore AppMintly — discover more apps, tools and PWAs from the same developer"
            className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-[#16A765] text-[#0A1F14] text-xs sm:text-sm font-bold tracking-wide hover:bg-[#128551] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A765] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171416] transition-all shadow-xs"
          >
            <span>Explore AppMintly</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
          <p className="text-[10px] sm:text-[11px] text-white/45 font-semibold tracking-wider">
            Discover • Install • Experience
          </p>
        </div>
      </div>
    </div>
  </section>
);
