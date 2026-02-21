import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// PWA Web App Manifest
// ---------------------------------------------------------------------------
// Served as a dynamic API route so we can set correct Content-Type headers
// and potentially customise the manifest per-request in the future
// (e.g. locale-specific names).
// ---------------------------------------------------------------------------

export async function GET() {
  const manifest = {
    name: 'JalSeva - Water Delivery',
    short_name: 'JalSeva',
    description: 'Order water delivery in minutes',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0066FF',
    theme_color: '#0066FF',
    categories: ['utilities', 'lifestyle'],
    lang: 'en-IN',
    dir: 'ltr',
    scope: '/',
    prefer_related_applications: false,
    icons: [
      {
        src: '/icons/icon-72.png',
        sizes: '72x72',
        type: 'image/png',
      },
      {
        src: '/icons/icon-96.png',
        sizes: '96x96',
        type: 'image/png',
      },
      {
        src: '/icons/icon-128.png',
        sizes: '128x128',
        type: 'image/png',
      },
      {
        src: '/icons/icon-144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-152.png',
        sizes: '152x152',
        type: 'image/png',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icons/icon-384.png',
        sizes: '384x384',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
    shortcuts: [
      {
        name: 'Order RO Water',
        short_name: 'RO Water',
        description: 'Quick order RO water delivery',
        url: '/?waterType=ro',
        icons: [
          {
            src: '/icons/icon-96.png',
            sizes: '96x96',
          },
        ],
      },
      {
        name: 'Order History',
        short_name: 'History',
        description: 'View your past orders',
        url: '/history',
        icons: [
          {
            src: '/icons/icon-96.png',
            sizes: '96x96',
          },
        ],
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
