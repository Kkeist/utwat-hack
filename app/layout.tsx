import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';

const serif = Cormorant_Garamond({
  variable: '--font-menu-serif',
  subsets: ['latin'],
  weight: ['400', '600'],
});

const sans = Inter({
  variable: '--font-menu-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Dishly',
  description: 'Give it a restaurant link and it looks up what each dish on the menu actually is.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/*
          Fixed, not painted into the body background: a `position: fixed`
          box always covers the current viewport height, no matter how tall
          the document gets. The previous attempt painted this into body's
          background with `background-attachment: fixed`, which sizes the
          image to one viewport height and simply stops there — everything
          below the first screen fell back to the plain background.
        */}
        <div
          aria-hidden
          className="paper-grain pointer-events-none fixed inset-y-0 left-0 z-0 hidden w-[16%] bg-side-panel min-[900px]:block"
        />
        <div
          aria-hidden
          className="paper-grain pointer-events-none fixed inset-y-0 right-0 z-0 hidden w-[16%] bg-side-panel min-[900px]:block"
        />
        <div className="paper-grain relative z-10 flex min-h-full flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
