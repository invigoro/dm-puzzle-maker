import { useEffect, useState } from 'react';
import { makerHash, playerHash } from '../kit/route';
import type { Words } from '../kit/words';
import type { MakerSide, PuzzleKind } from '../puzzles/types';

/** The longest a player link should be: a Discord message holds 2,000 characters. */
export const LONGEST_LINK = 2000;
/** How long typing pauses before the player link is made again: fingerprints take a moment. */
const PAUSE = 300;

interface SendProps<Design extends { words: Words }> {
  kind: PuzzleKind;
  side: MakerSide<Design>;
  design: Design;
}

/** The address of a page with this fragment. */
function linkTo(hash: string): string {
  const url = new URL(window.location.href);
  url.hash = hash;
  return url.toString();
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Sending a puzzle: the player link, to copy or preview, and a word about the page's own link, which holds the answer. */
export function Send<Design extends { words: Words }>({ kind, side, design }: SendProps<Design>) {
  const problems = side.problemsOf(design);
  const [link, setLink] = useState<string | null>(null);
  const [said, setSaid] = useState('');

  // Made afresh as the design changes, each time with a new salt.
  useEffect(() => {
    setLink(null);
    setSaid('');
    if (problems.length > 0) return;
    let current = true;
    const timer = setTimeout(async () => {
      const made = linkTo(await playerHash(kind.id, await side.toPuzzle(design)));
      if (current) setLink(made);
    }, PAUSE);
    return () => {
      current = false;
      clearTimeout(timer);
    };
    // `problems` comes from the design, so it's covered.
  }, [kind.id, side, design]);

  async function copyPlayerLink() {
    if (!link) return;
    setSaid((await copy(link)) ? 'Copied the player link.' : 'Couldn’t copy it: select the link below and copy it.');
  }

  async function copyOwnLink() {
    const own = linkTo(await makerHash(kind.id, design));
    setSaid((await copy(own)) ? 'Copied this page’s link. Keep it to yourself.' : 'Couldn’t copy it: copy the address from the address bar.');
  }

  return (
    <section className="panel send">
      <h2>Send it</h2>
      {problems.length > 0 ? (
        <ul className="problems">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      ) : (
        <p className="hint">
          The player link holds the puzzle as it starts, and fingerprints to check the answer against, never the answer
          itself.
        </p>
      )}
      <div className="row">
        <button type="button" className="primary" disabled={!link} onClick={copyPlayerLink}>
          Copy player link
        </button>
        <a className="button" href={link ?? undefined} aria-disabled={!link} target="_blank" rel="noopener">
          Preview as player
        </a>
      </div>
      {link && (
        <>
          <input className="link" readOnly value={link} aria-label="Player link" onFocus={(event) => event.target.select()} />
          <p className={link.length > LONGEST_LINK ? 'warning' : 'hint'}>
            {link.length.toLocaleString('en')} characters
            {link.length > LONGEST_LINK ? ': too long for one Discord message. Shorten the introduction, or the halves.' : '.'}
          </p>
        </>
      )}
      <p className="hint">
        This page’s own address holds the answer. Bookmark it to come back to this puzzle, but don’t send it to your
        players.{' '}
        <button type="button" className="link-button" onClick={copyOwnLink}>
          Copy this page’s link
        </button>
      </p>
      <p className="said" role="status">
        {said}
      </p>
    </section>
  );
}
