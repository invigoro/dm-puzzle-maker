import { useId, type ChangeEvent } from 'react';
import { LONGEST, type Words } from '../kit/words';

/** The words every puzzle has: its title, what the players read first, and the line for solving it. */
export function WordsFields({ words, onChange }: { words: Words; onChange(words: Words): void }) {
  const id = useId();
  const set = (name: keyof Words) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...words, [name]: event.target.value });
  return (
    <section className="panel">
      <h2>What the players read</h2>
      <div className="field">
        <label htmlFor={`${id}-title`}>Title</label>
        <input id={`${id}-title`} value={words.title} maxLength={LONGEST.title} placeholder="A puzzle" onChange={set('title')} />
      </div>
      <div className="field">
        <label htmlFor={`${id}-intro`}>Introduction</label>
        <textarea id={`${id}-intro`} rows={4} value={words.intro} maxLength={LONGEST.intro} onChange={set('intro')} />
        <span className="hint">Above the puzzle: a riddle, an inscription, or a hint at the answer and its order.</span>
      </div>
      <div className="field">
        <label htmlFor={`${id}-success`}>When they solve it</label>
        <input id={`${id}-success`} value={words.success} maxLength={LONGEST.success} placeholder="Solved." onChange={set('success')} />
      </div>
    </section>
  );
}
