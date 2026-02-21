import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { Providers } from './providers';
import './globals.css';

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------
export const metadata: Metadata = {
  title: 'JalSeva - Water Delivery',
  description:
    'Order clean water delivery to your doorstep in minutes. RO, mineral, and tanker water available 24/7 across India.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'JalSeva',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0066FF',
};

// ---------------------------------------------------------------------------
// Root Layout
// ---------------------------------------------------------------------------
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Toaster
            position="top-center"
            richColors
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 500,
                maxWidth: '90vw',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
