import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sergiolms.github.io/workout-tracker/'),
  title: 'Base — Registro de entrenamiento',
  description: 'Registro de entrenamiento, cardio y movilidad.',
  manifest: `${basePath}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${basePath}/icon.svg`, type: 'image/svg+xml' },
      { url: `${basePath}/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { url: `${basePath}/icon-512.png`, sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: `${basePath}/apple-touch-icon.png`, sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'Base — Registro de entrenamiento',
    description: 'Registro de entrenamiento, cardio y movilidad.',
    images: [{ url: '/og.png', width: 1536, height: 1024, alt: 'Base — Registro de entrenamiento' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Base — Registro de entrenamiento',
    description: 'Registro de entrenamiento, cardio y movilidad.',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = { themeColor: '#16834f', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body></html>;
}
