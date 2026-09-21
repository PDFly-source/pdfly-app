import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Install PDFMiniFly — Private. Powerful. Local.',
  description:
    'Install PDFMiniFly on Android, iOS, Windows, and Mac. Enjoy a fast, app-like PDF experience with offline local processing and zero cloud uploads.',
  openGraph: {
    title: 'Install PDFMiniFly — Private. Powerful. Local.',
    description:
      'Install PDFMiniFly on Android, iOS, Windows, and Mac. Enjoy a fast, app-like PDF experience with offline local processing.',
    url: 'https://pdfminifly.app/install',
  },
};

export default function InstallLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
