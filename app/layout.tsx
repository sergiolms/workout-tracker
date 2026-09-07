import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://base-entrenamiento-funcional.gitkraken-1019.chatgpt.site'),
  title: 'Base — Entrena para vivir mejor',
  description: 'Seguimiento simple de fuerza, cardio y movilidad para construir una base física duradera.',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'Base — Entrena para vivir mejor',
    description: 'Fuerza, cardio y movilidad sin presión. Construye una base física duradera.',
    images: [{ url: '/og.png', width: 1536, height: 1024, alt: 'Base — Entrena para vivir mejor' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Base — Entrena para vivir mejor',
    description: 'Fuerza, cardio y movilidad sin presión. Construye una base física duradera.',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = { themeColor: '#16834f', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body></html>;
}
