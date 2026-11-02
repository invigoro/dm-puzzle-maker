import type { Words } from '../kit/words';
import type { PlayerSide } from '../puzzles/types';

/** The players' page: the puzzle's title and introduction, the puzzle, and a line saying where it was made. */
export function PlayerPage<Puzzle extends { words: Words }>({ side, puzzle }: { side: PlayerSide<Puzzle>; puzzle: Puzzle }) {
  const { title, intro } = puzzle.words;
  return (
    <div className="player">
      <header className="puzzle">
        <h1 className="puzzle-title">{title || 'A puzzle'}</h1>
        {intro && <p className="intro">{intro}</p>}
      </header>
      <main>
        <side.Player puzzle={puzzle} />
      </main>
      <footer className="about">
        <p>
          Made with{' '}
          <a href="./" target="_blank" rel="noopener">
            Daedalus
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
