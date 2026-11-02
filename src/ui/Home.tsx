import { newPuzzleHash } from '../kit/route';
import { KINDS } from '../puzzles/registry';
import { Site } from './Site';
import { YourPuzzles } from './YourPuzzles';

/** The home page: what Daedalus does, the kinds of puzzle to make, and the puzzles made in this browser. */
export function Home() {
  return (
    <Site>
      <p className="lede">
        Puzzles for tabletop games. Make one, send your players a link, and they solve it in their browser. The link
        never holds the answer, so nobody can peek.
      </p>
      <section>
        <h2>Make a puzzle</h2>
        <ul className="kinds">
          {KINDS.map((kind) => (
            <li key={kind.id}>
              <a className="kind" href={newPuzzleHash(kind.id)}>
                <strong>{kind.name}</strong>
                <span>{kind.blurb}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
      <YourPuzzles />
    </Site>
  );
}
