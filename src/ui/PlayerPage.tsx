import type { PlayerSide } from '../puzzles/types';

/** The players' page: the puzzle and nothing else, with a line saying where it was made. */
export function PlayerPage<Puzzle>({ side, puzzle }: { side: PlayerSide<Puzzle>; puzzle: Puzzle }) {
  return (
    <div className="player">
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
