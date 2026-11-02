# Daedalus

Puzzles for tabletop games. A game master makes a puzzle, sends the players a link, and they solve
it in their browser. The link never holds the answer, so nobody can peek. It's named after Daedalus,
who built the Labyrinth.

**Live site:** https://daedalus.invigoro.me/ (once the repository is public; see
[Stack and hosting](docs/PLAN.md#stack-and-hosting))

## Using it

The home page lists the kinds of puzzle. Each opens a page for making one, and gives a link to send
the players.

- **Turning discs:** seven touching discs, each with six word-halves on its spokes. The players turn
  the discs and swap halves where they meet, until the six names around the centre are spelled out
  in order, from where the arrow points. Each half reads outward from its own disc's hub, so a pair
  counts either way round.
  - **Turn a disc** by tapping it (clockwise), Shift-clicking it (back), or dragging it round either
    way. **Swap** the two halves where discs meet by tapping the ⇄ there. From the keyboard, Tab
    picks a disc or a contact, the arrow keys turn and Enter swaps.
  - **Undo** a move, or **Start over**. A solved board lights up the names and shows the line for
    solving it.
  - For now the page has an example to try, with 🎲 for a new scramble. Making your own puzzle and
    sending it to your players comes next.

It pairs with [Sator](https://sator.invigoro.me/), which makes anagrams for puzzles,
[Stele](https://stele.invigoro.me/), which carves or inks text onto a weathered object, and
[Jabberwock](https://jabberwock.invigoro.me/), which writes text in made-up languages.

## Development

Requires Node.js 22.12 or newer. The repo pins 24 in [`.nvmrc`](.nvmrc).

```sh
npm install
npm run dev       # dev server with hot reload
npm test          # unit and page tests
npm run build     # type-check, then build to dist/
npm run preview   # serve the production build locally
```

Each kind of puzzle is a folder under [`src/puzzles/`](src/puzzles/) and an entry in
[`registry.ts`](src/puzzles/registry.ts). [docs/PLAN.md](docs/PLAN.md#kinds-of-puzzle) says what
each side provides.

Every push to `main` runs the tests, builds the site and deploys it to GitHub Pages
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)). Pushes to other branches run the
tests and the build without deploying ([`.github/workflows/test.yml`](.github/workflows/test.yml)).

## Plan

[docs/PLAN.md](docs/PLAN.md) covers the site, the turning discs, keeping answers secret, and the
roadmap.
