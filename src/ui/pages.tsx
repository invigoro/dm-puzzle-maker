import type { ReactNode } from 'react';
import type { Route } from '../kit/route';
import { kindOf } from '../puzzles/registry';
import { Home } from './Home';
import { Lost } from './Lost';
import { MakerPage } from './MakerPage';
import { PlayerPage } from './PlayerPage';

export interface Page {
  title: string;
  content: ReactNode;
}

const LOST: Page = { title: 'Daedalus', content: <Lost /> };

/**
 * The page a route opens, loading only its own kind's code for its own side: the players' page
 * never loads the maker. A link whose data its kind can't read is lost.
 */
export async function pageFor(route: Route): Promise<Page> {
  if (route.page === 'home') return { title: 'Daedalus', content: <Home /> };
  if (route.page === 'lost') return LOST;
  const kind = kindOf(route.kind);
  if (!kind) return LOST;
  if (route.page === 'make') {
    const side = await kind.maker();
    const design = route.data === null ? side.newDesign() : side.readDesign(route.data);
    return design === null
      ? LOST
      : { title: `${kind.name} · Daedalus`, content: <MakerPage kind={kind} side={side} design={design} id={route.id} /> };
  }
  const side = await kind.player();
  const puzzle = side.readPuzzle(route.data);
  return puzzle === null ? LOST : { title: puzzle.words.title || 'A puzzle', content: <PlayerPage side={side} puzzle={puzzle} /> };
}
