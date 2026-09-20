import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Install PDFly — Private. Powerful. Local.',
  description:
    'Install PDFly on Android, iOS, Windows, and Mac. Enjoy a fast, app-like PDF experience with offline local processing and zero cloud uploads.',
  openGraph: {
    title: 'Install PDFly — Private. Powerful. Local.',
    description:
      'Install PDFly on Android, iOS, Windows, and Mac. Enjoy a fast, app-like PDF experience with offline local processing.',
    url: 'https://pdfly.app/install',
  },
};

export default function InstallLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
