import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#07131c',
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ucl-draft-lemon.vercel.app';

export const metadata: Metadata = {
  title: 'FUT Draft — Chase 194',
  description:
    'Free FIFA 16-style FUT Draft with today\'s players. Build your squad, chase 194, conquer the UCL bracket.',
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'FUT Draft — Chase 194',
    description:
      'Free FIFA 16-style FUT Draft. Build your squad, chase 194, conquer the UCL bracket. No coins required.',
    url: siteUrl,
    siteName: 'FUT Draft',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FUT Draft — Chase 194',
    description:
      'Free FIFA 16-style FUT Draft. Build your squad, chase 194, conquer the UCL bracket.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect hints; fonts themselves are loaded via @import in globals.css */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased bg-background min-h-screen">{children}</body>
    </html>
  );
}
