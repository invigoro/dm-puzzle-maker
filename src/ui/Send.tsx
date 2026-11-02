import { useEffect, useRef, useState } from 'react';
import { playerHash } from '../kit/route';
import { discordLink, shorten } from '../kit/share';
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
  // A short link is for the player link it was made from, and goes when the design changes.
  const [short, setShort] = useState<{ of: string; link: string } | null>(null);
  const [shortening, setShortening] = useState(false);
  const shortLink = short && short.of === link ? short.link : null;
  // The player link now, for a shortening that finishes after the design has changed.
  const latest = useRef(link);
  useEffect(() => {
    latest.current = link;
  }, [link]);

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

  async function copyShortLink() {
    if (!link) return;
    if (shortLink) {
      setSaid((await copy(shortLink)) ? 'Copied the short link.' : 'Couldn’t copy it: select the short link below and copy it.');
      return;
    }
    const asked = link;
    setShortening(true);
    setSaid('Shortening…');
    const made = await shorten(asked);
    setShortening(false);
    if (latest.current !== asked) return;
    if ('problem' in made) {
      setSaid(`Couldn’t shorten it. ${made.problem}`);
      return;
    }
    setShort({ of: asked, link: made.short });
    setSaid((await copy(made.short)) ? 'Shortened, and copied the short link.' : 'Shortened: select the short link below and copy it.');
  }

  async function copyForDiscord() {
    if (!link) return;
    const title = design.words.title.trim() || kind.name;
    const text = discordLink(title, shortLink ?? link);
    setSaid((await copy(text)) ? `Copied for Discord, where it shows as “${title}”.` : 'Couldn’t copy it: select the link below and copy it.');
  }

  async function copyOwnLink() {
    // The address the maker keeps, which holds the puzzle's place among those saved here too.
    const own = window.location.href;
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
        <button type="button" disabled={!link} onClick={copyForDiscord}>
          Copy as a Discord link
        </button>
        <button type="button" disabled={!link || shortening} onClick={copyShortLink}>
          {shortLink ? 'Copy short link' : 'Shorten with is.gd'}
        </button>
      </div>
      {link && (
        <>
          <input className="link" readOnly value={link} aria-label="Player link" onFocus={(event) => event.target.select()} />
          <p className={link.length > LONGEST_LINK ? 'warning' : 'hint'}>
            {link.length.toLocaleString('en')} characters
            {link.length > LONGEST_LINK ? ': too long for one Discord message. Shorten the introduction, or the halves.' : '.'}
          </p>
          {shortLink && (
            <input className="link" readOnly value={shortLink} aria-label="Short link" onFocus={(event) => event.target.select()} />
          )}
          <p className="hint">
            <strong>Copy as a Discord link</strong> copies it as Discord shows a link by its title alone
            {shortLink ? ', using the short link' : ''}. <strong>Shorten with is.gd</strong> sends the player link to is.gd, a
            free link shortener, which keeps it for good. The short link opens the puzzle as it is now, so make another if you
            change it.
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
