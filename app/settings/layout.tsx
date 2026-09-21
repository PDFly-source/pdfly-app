import type { Metadata } from 'next';
import React from 'react';

// Settings is a private application state, not a public page.
export const metadata: Metadata = {
  title: 'Settings',
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
