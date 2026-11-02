import { useEffect, useState, type ChangeEvent } from 'react';
import { makerHash } from '../kit/route';
import { exportFile, forgetPuzzle, importPuzzles, readExport, savedPuzzles, type Saved } from '../kit/saved';
import { kindOf } from '../puzzles/registry';

/** "3 November 2026", in the reader's own way of writing dates. */
const dayOf = (time: number) => new Date(time).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

/** The puzzles made in this browser, to open again, and to move to another browser as a file. */
export function YourPuzzles() {
  // Only puzzles of kinds this site still has.
  const [saved, setSaved] = useState(() => savedPuzzles().filter((entry) => kindOf(entry.kind)));
  const [links, setLinks] = useState<ReadonlyMap<string, string>>(new Map());
  const [forgetting, setForgetting] = useState<string | null>(null);
  const [said, setSaid] = useState('');

  useEffect(() => {
    let current = true;
    Promise.all(saved.map(async (entry) => [entry.id, await makerHash(entry.kind, entry.design, entry.id)] as const)).then((made) => {
      if (current) setLinks(new Map(made));
    });
    return () => {
      current = false;
    };
  }, [saved]);

  const refresh = () => setSaved(savedPuzzles().filter((entry) => kindOf(entry.kind)));

  function forget(entry: Saved) {
    forgetPuzzle(entry.id);
    setForgetting(null);
    setSaid(`Removed ${entry.title || 'an untitled puzzle'}.`);
    refresh();
  }

  function download() {
    const url = URL.createObjectURL(new Blob([exportFile(saved)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `daedalus-puzzles-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const puzzles = readExport(await file.text());
    if (puzzles === null) {
      setSaid('That file doesn’t hold any puzzles of Daedalus’s.');
      return;
    }
    const added = importPuzzles(puzzles);
    setSaid(added === 1 ? 'Added 1 puzzle.' : `Added ${added} puzzles.`);
    refresh();
  }

  return (
    <section className="your-puzzles">
      <h2>Your puzzles</h2>
      {saved.length === 0 ? (
        <p className="hint">Puzzles you make are kept here, in this browser, as you make them.</p>
      ) : (
        <ul className="saved">
          {saved.map((entry) => (
            <li key={entry.id}>
              <a href={links.get(entry.id)} className="saved-title">
                {entry.title || 'Untitled'}
              </a>
              <span className="hint">
                {kindOf(entry.kind)?.name} · changed {dayOf(entry.saved)}
              </span>
              {forgetting === entry.id ? (
                <span className="row">
                  <button type="button" onClick={() => forget(entry)}>
                    Remove for good
                  </button>
                  <button type="button" onClick={() => setForgetting(null)}>
                    Keep it
                  </button>
                </span>
              ) : (
                <button type="button" className="link-button" aria-label={`Remove ${entry.title || 'Untitled'}`} onClick={() => setForgetting(entry.id)}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        <button type="button" onClick={download} disabled={saved.length === 0}>
          Export to a file
        </button>
        <label className="button">
          Import from a file
          <input type="file" accept=".json,application/json" className="hidden-file" onChange={upload} />
        </label>
      </div>
      <p className="hint">
        They’re kept only in this browser. Export them to keep a copy, or to move them to another browser.
      </p>
      <p className="said" role="status">
        {said}
      </p>
    </section>
  );
}
