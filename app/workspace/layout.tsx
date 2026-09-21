import type { Metadata } from 'next';
import React from 'react';

// Workspace is a private, user-specific application state (the user's local
// library of documents). It has no public indexable content, so keep it out
// of search indexes.
export const metadata: Metadata = {
  title: 'Workspace',
  robots: { index: false, follow: false },
};

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
