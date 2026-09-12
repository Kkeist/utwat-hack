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
  description: 'It reads the menu, decides what you are eating, and explains why the decision was never in doubt.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
