'use client';

import React from 'react';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FDFBF7] text-[#1A1416] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold font-serif">Something went wrong</h1>
          <p className="text-sm text-neutral-600">
            A fatal error occurred. Your documents remain private and safe in local memory.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-[#7A1635] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
