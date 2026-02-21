import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { Providers } from './providers';
import './globals.css';

// ---------------------------------------------------------------------------
// Metadata (multilingual India support)
// ---------------------------------------------------------------------------
export const metadata: Metadata = {
  title: 'JalSeva - Water Delivery | जलसेवा',
  description:
    'Order clean water delivery to your doorstep in minutes. RO, mineral, and tanker water available 24/7 across India. घर बैठे पानी मंगाएं।',
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
  other: {
    'google': 'notranslate',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
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
    <html lang="en" dir="ltr">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=yes" />
      </head>
      <body className="font-sans antialiased">
        {/* Skip to main content for keyboard/screen reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-blue-600 focus:font-semibold"
        >
          Skip to main content / मुख्य सामग्री पर जाएं
        </a>
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
