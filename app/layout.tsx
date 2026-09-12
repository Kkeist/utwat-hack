import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter, Kalam, Permanent_Marker } from 'next/font/google';
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

/** Thick marker lettering for the DISHLY wordmark, the RESTAURANT pill and SEARCH. */
const logo = Permanent_Marker({
  variable: '--font-menu-logo',
  subsets: ['latin'],
  weight: '400',
});

/** Looser handwriting for everything else in the header/hero: labels, placeholder, footer credit. */
const hand = Kalam({
  variable: '--font-menu-hand',
  subsets: ['latin'],
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  title: 'Dishly',
  description: 'Give it a restaurant link and it looks up what each dish on the menu actually is.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${logo.variable} ${hand.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
