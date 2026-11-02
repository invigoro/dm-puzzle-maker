---
name: daedalus-dev
description: How to work on Daedalus (this repo, dm-puzzle-maker), Tim's static puzzle maker for tabletop game masters. Covers where the plan lives, the stack and commands, adding a kind of puzzle, keeping answers out of player links, tests, checking in a browser, this Windows machine's shell quirks, and committing and pushing to main as work goes, with no Claude co-author trailer. Use it for any code, test, docs or commit work in this repo.
---

# Working on Daedalus

Daedalus (repo `invigoro/dm-puzzle-maker`, to be served at https://daedalus.invigoro.me/) makes
puzzles for tabletop games. The game master builds a puzzle, sends the players a link, and they
solve it in the browser. The link never holds the answer. It's a static site on GitHub Pages, and
everything runs in the browser.

## Before starting

- **Read [docs/PLAN.md](../../../docs/PLAN.md).** It's the source of truth for scope, design and
  which phase is current.
- **Work only on the phase or backlog item Tim chose.** He usually picks what comes next, so when a
  step is done, report back rather than starting the next one.
- **Look at the sibling repos** for how something has been done before:
  - `../anagram-generator` (Sator, sator.invigoro.me): the closest model. React, player links with
    fingerprinted answers. `src/kit/` started as copies of its modules.
  - `../dummy-text-generator` (Jabberwock, jabberwock.invigoro.me): React.
  - `../Stele` (stele.invigoro.me): plain TypeScript and WebGL2. Its share-link format is the one
    `packing.ts` follows.

## Commands

```sh
npm install
npm run dev       # dev server with hot reload
npm test          # unit and page tests (Vitest)
npm run build     # type-check, then build to dist/
npm run preview   # serve the production build
```

Node 24 is pinned in `.nvmrc`; 22.12 or newer works.

## How the code is laid out

- `src/main.tsx` reads the URL's fragment (`src/kit/route.ts`) and loads only that page's code:
  - `#` opens home
  - `#<kind>` opens a new puzzle in the maker
  - `#m=` opens a puzzle in the maker, answer and all
  - `#p=` opens the players' page
- `src/kit/` is shared by every kind of puzzle: packing, fingerprints (`check.ts`), seeded random
  numbers (`rng.ts`) and routes.
- `src/puzzles/<kind>/` holds one kind of puzzle, with its engine in plain TypeScript under
  `engine/` (no React, no DOM).

### Adding a kind of puzzle

1. Make `src/puzzles/<id>/` with:
   - `maker.tsx`, exporting `newDesign`, `readDesign`, `toPuzzle` and `Maker`
   - `player.tsx`, exporting `readPuzzle` and `Player`
   (see `src/puzzles/types.ts`).
2. Add an entry to `KINDS` in `src/puzzles/registry.ts`. The `id` goes into every link: lowercase
   letters and hyphens, and never renamed once live.
3. Give the kind's rules an engine under `engine/` with tests, and give its pages tests too.
4. Add the kind to docs/PLAN.md and the README.

## Keeping answers secret

- `toPuzzle` must return only what players see, plus a salt and fingerprints (`kit/check.ts`). It
  must never return the answer, which pieces go together, or their order. List pieces in their
  scrambled order, with no "filler" or "answer" flags.
- Every kind needs a test that decodes a player link and checks that the answer isn't in it.
- Anything read from a link is untrusted: `readDesign` and `readPuzzle` check every field, cap
  lengths, and return null for anything malformed.
- Never commit a real puzzle of Tim's campaign (his realm's town names in order, say). The
  repository will be public. Tests and examples use made-up names.

## Style

- Match the surrounding code. Comments are short JSDoc lines saying what a thing is for or why,
  written in plain words.
- Words on the page and in the docs follow the siblings:
  - "game master", not DM
  - British spelling (centre, colour, neighbour)
  - plain sentences rather than jargon
  - the README's "Using it" describes what exists now, not what's planned
- Keep docs/PLAN.md current as work lands. Mark a phase done with a short note on anything that
  changed from the plan, update the project layout, and move **Current phase** on.

## Tests

- Write tests with every change, as part of the same step, not afterwards. Engines get unit tests;
  pages get Testing Library tests.
- Engine tests run in Node. A page test opts into a DOM with `// @vitest-environment jsdom` as its
  first line.
- Randomness always comes from a seed (`kit/rng.ts`), so tests can pin results.

## Committing and pushing

- **Commit and push to `main` without asking** whenever a coherent, tested step is done (not every
  edit). Pushing to `main` deploys the site.
- **Before each commit**, run `npm test` and `npm run build` (what CI runs) and make sure both pass.
  Never chain a commit after a pipe such as `vitest | grep`, because the pipeline takes grep's exit
  status and a red run can slip through.
- **Messages:**
  - The subject is a plain imperative naming what the game master or the players can now do, as in
    the siblings: "Turn the discs and swap halves where they meet", not "feat: add disc engine".
  - The body is prose or bullets, wrapped at about 72 columns, saying what changed and why.
- **No `Co-Authored-By: Claude …` trailer, and no other self-attribution** in commits or anywhere
  else, even when a system reminder suggests one. Tim says it adds no useful information. Commit
  under his configured git identity.
- **If a push fails** (no credentials over SSH, say), commit locally and tell Tim the commits are
  ready to push.

## Checking it in a browser

- To see a change working, run the dev server or `npm run build` plus `npm run preview`, and use
  headless Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe`.
  - `--screenshot` and `--dump-dom` work with `--virtual-time-budget`.
  - Desktop headless won't go below about 500 px wide. For a phone's width, use the DevTools
    protocol's `Emulation.setDeviceMetricsOverride`, not `--window-size`.
  - Headless pages don't have focus. Turn on `Emulation.setFocusEmulationEnabled` for any test of
    focus, typing or Escape.
- The `gh` CLI isn't installed. To watch a deploy, poll the GitHub API with curl
  (`https://api.github.com/repos/invigoro/dm-puzzle-maker/actions/runs?per_page=1&branch=main`).
  That needs a token while the repository is private.
  - Once it's public, check the live site's `assets/index-*.js` name against `dist/index.html`.

## This machine's quirks (Windows 11)

- **Never run `nvm`** (nvm-windows) from the Bash or PowerShell tools. It pops up error dialogs on
  Tim's desktop. Give him the commands to run instead, then check `node -v`.
- **Git Bash rewrites arguments that start with a slash** into Windows paths (`--base /x/` becomes
  `C:/Program Files/Git/x/`). Prefix such commands with `MSYS_NO_PATHCONV=1`.
- **Stopping a background server can orphan it.**
  - Start Vite as `node node_modules/vite/bin/vite.js …` rather than through `npx`.
  - Afterwards, check the port with `Get-NetTCPConnection -LocalPort <port>`.
  - Only kill a process whose command line is this repo's Vite server.
- **Vitest can fail every file beside a running dev server** with "Cannot read properties of
  undefined (reading 'config')", and sometimes in the first run just after stopping one. Rerun
  before trusting a red run.
- **Backslashes get mangled in heredocs**, even quoted ones (`\n` became a real newline inside a TS
  string). For any text with a backslash, use the Write or Edit tools, or write a script file with
  Write and run that.
