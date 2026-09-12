/**
 * OWNER: Workstream D (UI)
 *
 * /menu?url=…&party=… — the result page. The Suspense boundary is what
 * Next requires around anything that reads the query string on the client.
 */
import { Suspense } from 'react';
import { MenuView } from '../components/MenuView';

export default function MenuPage() {
  return (
    <Suspense fallback={null}>
      <MenuView />
    </Suspense>
  );
}
