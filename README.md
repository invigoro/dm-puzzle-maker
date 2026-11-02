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
- **Your puzzles:** every puzzle you make is saved in your browser as you make it, and listed on the
  home page, newest first, to open again or remove. **Export to a file** keeps a copy, and **Import
  from a file** brings puzzles into another browser, keeping the newer of any you have in both.

On the players' page, progress is kept in their browser, so a reload or a week between sessions
doesn't lose the board.

### Turning discs

Touching discs of stone, rimmed in bronze, each with six word-halves or pictures cut into its
spokes. The players turn the discs and swap halves at the bronze studs where they meet, until the
names are spelled out in order, from where the arrow points:
- **Seven discs:** six names round the centre disc.
- **Three discs**, as in Baldur's Gate 3's Defiled Temple: three names, where the three discs meet.
  A quick puzzle.

- **Lettering:** each half reads down its spoke from its own disc's hub, every letter standing on
  the rim. So the two halves at a contact stand foot to foot, and a name counts either way round.
- **Moves:** tap a disc to turn it clockwise, Shift-click it to turn it back, or drag it round either
  way. Tap the ⇄ where two discs meet to swap the halves there. From the keyboard, Tab picks a disc
  or a contact, the arrow keys turn and Enter swaps. **Undo** and **Start over** are below the board.
- **Solving:** a solved board lights up the names, and shows the line for solving it.
- **Making one:**
  - **The discs:** three or seven, each drawn small. The names and filler follow the choice, and
    any beyond its count are kept aside in case you change back.
  - **The names:** six or three of them, each in two halves, in order clockwise from the arrow.
    **Any start** counts them in order from any of their contacts, and takes the arrow away.
    **Glow** lights each name as it comes right, for an easier puzzle; it's off unless you turn it
    on, as a player could then test names one at a time. **Start from the example** fills in
    made-up towns, to see how it works.
  - **Pictures:** a half can be words, a picture, or both. 🖼 beside any half opens a search of
    about 4,000 fantasy icons from [game-icons.net](https://game-icons.net/). A picture stands at
    the rim end of its spoke like the letters, and the page names whoever made each picture on show,
    as their license asks.
  - **Filler:** the other 30 spokes. Blank boxes fill themselves with halves of place names (ASH,
    THORN, WICK…), and 🎲 picks others. Names that look right but aren't make the best filler.
  - **The start:** every piece anywhere, or 20, 10 or 5 moves from solved for an easier puzzle, with
    🎲 for a new scramble. Any scramble can be solved, and none starts with a name already in place.
    Or **set it by hand**: turn and swap a board of its own until it's as the players should find
    it, starting from the scramble, from solved, or from a fresh scramble. The page says how many
    names start in their places.
  - **Try it:** the board as the players will see it, to play, or solved.

### Word guess

A word or phrase to guess in a set number of tries: a password at a door, a name, or a riddle's
answer. Only its letters count, in capitals, with accents taken off.

- **How they try:** they type any letters, knowing only how many there are (and where the words
  break, unless that's hidden), or they arrange the answer's own letters as shuffled tiles.
- **What a try tells them:** letter by letter (blue for the right place, gold for in the answer
  elsewhere, counting repeated letters as the familiar game does), or only right or wrong. Marking
  letter by letter puts a quick fingerprint of each letter in the player link, so a programmer could
  read the answer from it; the maker says so beside the choice.
- **Tries:** one, three, six, ten, or as many as they like, with a line for running out. The tries
  made are kept in the browser, so a reload gives no more.
- **Hints:** as many letters as you allow, a letter at a time, each word's first letter first.
- **The line for solving it** is sealed with the answer, so the link holds it but only the right
  answer opens it.

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

The pictures are written to `public/icons/` before every dev server and build, from the
`@iconify-json/game-icons` package. [SOURCES.md](SOURCES.md) says where they come from, how each is
credited, and how to update them.

Each kind of puzzle is a folder under [`src/puzzles/`](src/puzzles/) and an entry in
[`registry.ts`](src/puzzles/registry.ts). [docs/PLAN.md](docs/PLAN.md#kinds-of-puzzle) says what
each side provides.

Every push to `main` runs the tests, builds the site and deploys it to GitHub Pages
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)). Pushes to other branches run the
tests and the build without deploying ([`.github/workflows/test.yml`](.github/workflows/test.yml)).

## Plan

[docs/PLAN.md](docs/PLAN.md) covers the site, the turning discs, keeping answers secret, and the
roadmap.
