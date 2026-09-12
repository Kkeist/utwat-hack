import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Courgette } from 'next/font/google';
import './globals.css';

/** Card text: a menu serif with a true italic for descriptions. */
const serif = Cormorant_Garamond({
  variable: '--font-serif-var',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

/** Sign-painter script: wordmark and section headings only. */
const script = Courgette({
  variable: '--font-script-var',
  subsets: ['latin'],
  weight: '400',
});

const description = 'Give it a restaurant link and it looks up what each dish on the menu actually is.';

export const metadata: Metadata = {
  title: 'Dishly',
  description,
  applicationName: 'Dishly',
  appleWebApp: {
    title: 'Dishly',
    statusBarStyle: 'default',
  },
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Dishly',
    description,
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dishly',
    description,
    images: ['/og-image.png'],
  },
  other: {
    'msapplication-TileColor': '#2f4434',
    'msapplication-config': '/browserconfig.xml',
  },
};

export const viewport: Viewport = {
  themeColor: '#2f4434',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${script.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/*
          The room. Table and walls are absolutely positioned inside a wrapper
          that is as tall as the document, so they run the full height of any
          page — real columns, not viewport-fixed overlays.
        */}
        <div className="relative flex min-h-full flex-1 flex-col">
          <div aria-hidden className="paper-grain pointer-events-none absolute inset-0 z-0 bg-ground" />
          <div
            aria-hidden
            className="linen paper-grain pointer-events-none absolute inset-y-0 left-0 z-[1] hidden w-[14%] min-[900px]:block"
          />
          <div
            aria-hidden
            className="linen paper-grain pointer-events-none absolute inset-y-0 right-0 z-[1] hidden w-[14%] min-[900px]:block"
          />

          {/* Content stays clear of the walls: the same 14% is reserved on each side. */}
          <div className="relative z-10 flex flex-1 flex-col min-[900px]:px-[14%]">{children}</div>
        </div>
      </body>
    </html>
  );
}
