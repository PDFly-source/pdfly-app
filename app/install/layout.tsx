import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: { absolute: 'Install PDFMiniFly — Private. Powerful. Local.' },
  alternates: { canonical: '/install' },
  description:
    'Install PDFMiniFly on Android, iOS, Windows, and Mac. Enjoy a fast, app-like PDF experience with offline local processing and zero cloud uploads.',
  openGraph: {
    title: 'Install PDFMiniFly — Private. Powerful. Local.',
    description:
      'Install PDFMiniFly on Android, iOS, Windows, and Mac. Enjoy a fast, app-like PDF experience with offline local processing.',
    url: `${SITE_URL}/install`,
  },
};

export default function InstallLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
