# Daedalus

Puzzles for tabletop games. A game master makes a puzzle, sends the players a link, and they solve
it in their browser. The link never holds the answer, so nobody can peek. It's named after Daedalus,
who built the Labyrinth.

**Live site:** https://daedalus.invigoro.me/

## Using it

The home page lists the kinds of puzzle. Each opens a page for making one, and every one ends the
same way:

- **What the players read:** a title, an introduction (a riddle, an inscription, a hint at the
  order), and a line for when they solve it.
- **Send it:** Copy player link, or Preview as player. The player link holds the puzzle as it starts,
  and fingerprints to check the answer against, never the answer itself. The page says how long the
  link is, and warns when it's too long for one Discord message.
- **The page's own address** holds the puzzle, answer and all, so a bookmark brings it back. It's
  compressed, so it never spells the answer out, but don't send it to your players.

On the players' page, progress is kept in their browser, so a reload or a week between sessions
doesn't lose the board.

### Turning discs

Seven touching discs, each with six word-halves on its spokes. The players turn the discs and swap
halves where they meet, until the six names around the centre are spelled out in order, from where
the arrow points.

- **Lettering:** each half reads down its spoke from its own disc's hub, every letter standing on
  the rim. So the two halves at a contact stand foot to foot, and a name counts either way round.
- **Moves:** tap a disc to turn it clockwise, Shift-click it to turn it back, or drag it round either
  way. Tap the ⇄ where two discs meet to swap the halves there. From the keyboard, Tab picks a disc
  or a contact, the arrow keys turn and Enter swaps. **Undo** and **Start over** are below the board.
- **Solving:** a solved board lights up the names, and shows the line for solving it.
- **Making one:**
  - **The names:** six of them, each in two halves, in order clockwise from the arrow. **Any start**
    counts them in order from any contact, and takes the arrow away. **Start from the example**
    fills in six made-up towns, to see how it works.
  - **Filler:** the other 30 spokes. Blank boxes fill themselves with halves of place names (ASH,
    THORN, WICK…), and 🎲 picks others. Names that look right but aren't make the best filler.
  - **The start:** every piece anywhere, or 20, 10 or 5 moves from solved for an easier puzzle, with
    🎲 for a new scramble. Any scramble can be solved, and none starts with a name already in place.
  - **Try it:** the board as the players will see it, to play, or solved.

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
