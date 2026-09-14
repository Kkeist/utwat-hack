'use client';
/**
 * OWNER: Workstream D (UI)
 *
 * The entry page: awning, the Restaurant card with the URL form. Submitting
 * goes to /menu with the URL and party size in the query string, so the
 * result has its own address and the browser's Back returns here.
 */
import { useRouter } from 'next/navigation';
import { copy } from './copy';
import { Header } from './components/Header';
import { Hero } from './components/Hero';

export default function Home() {
  const router = useRouter();

  return (
    <>
      <Header />

      <main className="mx-auto w-full max-w-[44rem] flex-1 px-4 pt-3 pb-14 sm:px-6 sm:pt-4">
        <Hero
          onSubmit={(url, partySize) =>
            router.push(`/menu?url=${encodeURIComponent(url)}&party=${partySize}`)
          }
        />
      </main>

      <footer className="mx-auto w-full max-w-[44rem] px-4 pb-8 text-center text-base italic text-ink-soft sm:px-6">
        <p>{copy.madeBy}</p>
        <p className="mt-1 text-sm not-italic text-ink-soft/80">
          {copy.demoNotice.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
      </footer>
    </>
  );
}
