import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UCL Draft — Build Your Squad',
  description:
    'Draft your ultimate Champions League squad and compete in the UCL knockout bracket.',
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
