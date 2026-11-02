import { Fragment, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { readRoute } from './kit/route';
import { KINDS } from './puzzles/registry';
import { pageFor } from './ui/pages';
import './style.css';

const root = createRoot(document.getElementById('root')!);
const kinds = KINDS.map((kind) => kind.id);
/** How many addresses have been opened, so a slow one can't replace a newer one. */
let opened = 0;

/** Opens the page the address holds, read before it first draws, so it never shows an empty page first. */
async function open() {
  const opening = ++opened;
  const { title, content } = await pageFor(await readRoute(window.location.hash, kinds));
  if (opening !== opened) return;
  document.title = title;
  // Keyed by the opening, so a new address always starts its page afresh.
  root.render(
    <StrictMode>
      <Fragment key={opening}>{content}</Fragment>
    </StrictMode>,
  );
}

// A link followed on the page, or pasted into the address bar, opens what it holds. Pages that keep
// their state in the address use history.replaceState, which doesn't count.
window.addEventListener('hashchange', open);
await open();
