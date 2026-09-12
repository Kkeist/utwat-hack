import type { Metadata } from 'next';
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

export const metadata: Metadata = {
  title: 'Dishly',
  description: 'Give it a restaurant link and it looks up what each dish on the menu actually is.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${script.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* The table: kraft paper with fibre, always one viewport, behind everything. */}
        <div aria-hidden className="paper-grain pointer-events-none fixed inset-0 z-0 bg-ground" />

        {/*
          The room: green linen walls either side. `position: fixed` boxes size
          to the viewport, so they run the full height however long the page
          gets — a `background-attachment: fixed` on body stops after one screen.
        */}
        <div
          aria-hidden
          className="linen paper-grain pointer-events-none fixed inset-y-0 left-0 z-[1] hidden w-[14%] min-[900px]:block"
        />
        <div
          aria-hidden
          className="linen paper-grain pointer-events-none fixed inset-y-0 right-0 z-[1] hidden w-[14%] min-[900px]:block"
        />

        {/* Content stays clear of the walls: the same 14% is reserved on each side. */}
        <div className="relative z-10 flex min-h-full flex-1 flex-col min-[900px]:px-[14%]">{children}</div>
      </body>
    </html>
  );
}
