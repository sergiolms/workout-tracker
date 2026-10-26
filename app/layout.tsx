import type { Metadata, Viewport } from 'next';
import './globals.css';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      'https://sergiolms.github.io/workout-tracker/',
  ),
  title: 'Zero to Hero · Entrenamiento',
  description: 'Registro de entrenamiento, cardio y movilidad.',
  applicationName: 'Zero to Hero',
  appleWebApp: {
    capable: true,
    title: 'Zero to Hero',
    statusBarStyle: 'default',
  },
  manifest: `${basePath}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${basePath}/icon.svg`, type: 'image/svg+xml' },
      { url: `${basePath}/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { url: `${basePath}/icon-512.png`, sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      {
        url: `${basePath}/apple-touch-icon.png`,
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
  openGraph: {
    title: 'Zero to Hero · Entrenamiento',
    description: 'Registro de entrenamiento, cardio y movilidad.',
    images: [
      {
        url: `${basePath}/zero-to-hero-social.png`,
        width: 1200,
        height: 630,
        alt: 'Zero to Hero · Tu entrenamiento, paso a paso',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zero to Hero · Entrenamiento',
    description: 'Registro de entrenamiento, cardio y movilidad.',
    images: [`${basePath}/zero-to-hero-social.png`],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7f1' },
    { media: '(prefers-color-scheme: dark)', color: '#111b18' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
