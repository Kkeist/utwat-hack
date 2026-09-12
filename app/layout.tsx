import type { Metadata } from 'next';
import { Cormorant_Garamond, Fredoka, Inter } from 'next/font/google';
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

/** The rounded, hand-drawn-adjacent face for the Dishly wordmark and header labels. */
const logo = Fredoka({
  variable: '--font-menu-logo',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Dishly',
  description: 'Give it a restaurant link and it looks up what each dish on the menu actually is.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${logo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
