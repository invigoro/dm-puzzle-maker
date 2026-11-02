# Daedalus implementation plan

Daedalus makes puzzles for tabletop games. The game master builds a puzzle, sends the players a
link, and the players solve it in their browser. The link never holds the answer: the players'
page checks their moves against fingerprints of it. Puzzles a page can't check get a code that the
game master's page can check instead. It's named after Daedalus, who built the Labyrinth.

It holds many kinds of puzzle, each added in code as a folder of its own. The first is **turning
discs**, after the disc puzzle in Baldur's Gate 3's Defiled Temple. There are seven touching discs,
each with six word-halves or pictures on its spokes. The players turn the discs, and swap halves
where two discs touch, until the six pairs around the centre spell six names in order. The first
puzzle spells the six great towns of the game master's realm.

The site must be static, hosted on GitHub Pages, and everything runs in the browser.

**Current phase:** Phase 0 is built and tested. It's done once the repository is public and a push
to `main` deploys the site. Phase 1 is next.

## The site

### Pages

- **Home** (`#`): the kinds of puzzle, each with a line on what it is. From Phase 3 it also lists
  the game master's saved puzzles.
- **Maker** (`#discs` for a new puzzle, `#m=…` for one in progress): the game master's page, which
  holds the answer.
- **Player** (`#p=…`): the players' page. It loads only its kind's player code, with no maker and no
  answer.

### Links

Links carry the puzzle in the URL's fragment, which never reaches a server. It's packed as Sator's
and Stele's links are: JSON, deflate-raw compressed and base64url encoded. Each link holds
`{ v, kind, data }`, so `main.tsx` knows which kind's code to load.

- `#m=` holds the game master's design, answer and all. The maker keeps it current in the address
  bar, so a bookmark or a reload brings the puzzle back. Being compressed, the address bar never
  spells out the answer during a screen share.
- `#p=` holds only what the players see, plus a salt and fingerprints to check their board against.
- A link that doesn't hold a puzzle this site knows opens a page that says so.
- A player link should fit in a Discord message (2,000 characters). So it holds no uploaded images:
  pictures are named from the built-in icon set.

### Kinds of puzzle

Each kind lives in its own folder under `src/puzzles/`, with an entry in
`src/puzzles/registry.ts`:

```ts
{ id: 'discs', name: 'Turning discs', blurb: '…',
  maker: () => import('./discs/maker'),     // the game master's side
  player: () => import('./discs/player') }, // the players' side: never the answer
```

- **The maker side** has:
  - `newDesign()`
  - `readDesign(data)`, which reads untrusted data from a link or a file
  - `toPuzzle(design)`, which makes what a player link holds
  - the `Maker` component
- **The player side** has `readPuzzle(data)` and the `Player` component.
- **The `id`** is written into every link, so it's never renamed. It's lowercase letters and
  hyphens, so it can't be mistaken for `m=` or `p=`.
- **Each side** is its own chunk, loaded when its page opens.
- **What every kind shares** lives in `src/kit/`:
  - link packing, fingerprints, seeded random numbers and the routes
  - from Phase 2, the page shells: the puzzle's words (its title, its introduction and the line for
    solving it), Copy player link, Preview as player, and progress kept in the browser

Adding a kind of puzzle takes a folder and a registry entry, and nothing else.

### Checking answers

- **On the players' page:** the board comes down to an answer key. For the discs, that's the pairs
  around the centre. The player link holds a salted, slow (PBKDF2) fingerprint of each key that
  counts, as Sator's player links do, and the page checks the board against them after every move.
- **By the game master:** for puzzles a page can't check, such as a riddle answered in the players'
  own words, the players' page shows a short code made from their answer. The game master's page
  shows the code a right answer makes. This gets built when a kind of puzzle needs it.

### Keeping the answer secret

- A player link holds the puzzle as the players first see it, and nothing more. Tests decode one
  and check that the answer can't be read from it. That covers the answer itself, which pieces
  belong together, and their order.
- Fingerprints are slow to make, so guessing at them takes a long while. A determined programmer
  could still work an answer out from a player page, as with Sator's. That's for the table to
  settle, not the tool.
- The maker says plainly which link is the players' and which holds the answer.
- The game master's puzzles live in their links and their browser, never in this repository, which
  will be public. Tests use made-up names.

## Turning discs

### The board

There are seven equal discs: one in the centre and six around it, each touching the centre and its
two neighbours.

```
         (1)
    (6)       (2)        The centre touches all six outer discs.
         (C)             Each outer disc touches three others: the centre and its two
    (5)       (3)        neighbours, at points 60° apart on its inner side.
         (4)
```

- **Spokes:** each disc has six spokes, 60° apart, and each spoke holds a **node**: half a name, a
  picture, or both. The centre's six spokes point at its six contacts. Each outer disc has three
  spokes at its contacts and three pointing out. That makes 42 nodes.
- **Turning:** turning a disc moves its nodes one spoke round (60°). Tapping a disc turns it
  clockwise, and Shift-click or its ↺ handle turns it back.
- **Swapping:** where two discs touch, two nodes meet, one from each disc. Tapping the contact swaps
  them. It's the only way a node moves from one disc to another.
- **Lettering:** a half's letters stand one above the other along its spoke, with the first letter
  nearest its own disc's hub.
  - At a contact the two halves meet end to end. So the line from the centre's hub to the top disc's
    hub reads K A R N T S E R, each half read outward from its own hub.
  - A pair spells its name whichever disc holds which half, so there's no first half to get wrong,
    and swapping a right pair leaves it right.
  - Each letter stays upright as its disc turns.
  - Letters are all capitals, so case can't give away which half comes first in the name.

### The goal

- The game master gives six pairs, each a name in two halves (KARN + REST, MARROW + GATE…), in
  order.
- The puzzle is solved when the six contacts around the centre hold the six pairs, in order,
  clockwise.
- **Where the order starts:** a mark on the board shows the first contact. By default it's the top,
  so an order like the map's can start in the north. With **Any start**, the six pairs count in
  order from any contact.
- **Filler:** the other 30 nodes. They can be names that sound right and aren't, or anything else.

### Every scramble can be solved

- Turning a disc takes any of its nodes to any of its spokes, and so to any of its contacts.
- A swap there passes the node to the neighbouring disc, and every disc is joined to the rest
  through its contacts.
- Put together, the moves can swap any two nodes, so they can make every arrangement of the 42.
  Unlike the 15-puzzle, there's no arrangement that can't be undone.
- So a scramble can be any arrangement at all. A test runs a simple solver on scrambles to be sure.

### The engine

The engine lives in `src/puzzles/discs/engine/`, in plain TypeScript with no React or DOM, like
Sator's engine.

- **Layout:** the discs' centres and radii, and the contacts, found where discs touch. The flower of
  seven is the first layout. Being data, other layouts (three discs, nineteen) can be added the same
  way.
- **Board:** which node is on each of the 42 spokes, as seen on the board. A turn moves a disc's six
  nodes round, and a swap trades the two at a contact. The page counts each disc's turns separately,
  so a disc always animates the way it turned.
- **Answer:** the key is the six centre pairs in order.
  - Each pair's two halves are sorted, so either way round counts.
  - Halves are compared as text in capitals, or as icon names, rather than as nodes. So two nodes
    that look alike can stand in for each other.
  - With Any start, each of the order's six rotations gets a fingerprint.
- **Scramble:** seeded, with 🎲 and the seed shown.
  - A **full** scramble places the nodes at random, and tries again until no pair starts out right.
  - A **light** scramble makes a number of moves away from solved, for an easier puzzle.
- **Filler:**
  - Blank filler nodes fill themselves from a built-in list of place-name halves (ASH, THORN, FORD,
    WICK, MERE, HOLLOW…). The fill never repeats a half or uses one of the answer's.
  - The game master can write any or all of them instead.
- **Solver**, for tests: puts each answer node in place in turn, by turning and swapping, without
  disturbing those already placed.

### The players' page

- **The board:** drawn in SVG and filling the screen's width, with the game master's title and
  introduction above it.
- **Moves:**
  - Tap a disc to turn it clockwise, or Shift-click it or use its ↺ to turn it back.
  - Tap a contact's ⇄ to swap.
  - From the keyboard, Tab picks a disc or a contact, arrow keys turn and Enter swaps.
  - Turns and swaps animate.
- **Controls:** Undo, Start over, and a count of moves.
- **Solving:** when the board is solved, the six names light up and the game master's line shows
  ("The great door rumbles open.").
- **Saving:** progress is kept in the browser, so a reload, or a week between sessions, doesn't lose
  the board.
- **No shared board:** with no server, each player has their own copy. One player can drive and
  share their screen, or the game master can put it on the table's screen.

### The maker

- **The words:** title, introduction (the riddle or the inscription), and the line for solving it.
- **The pairs:** six rows of first half and second half, in order from the mark. Halves of up to
  about seven letters fit their spokes, and longer ones are set smaller.
- **Any start:** off by default.
- **Filler:** 30 boxes. Blank ones are filled in from the built-in list, with 🎲 for another fill.
- **Start:** full or light scramble, with 🎲 and the seed.
- **The board:** shows the puzzle as the players will first see it, or solved.
- **Links:** Preview as player and Copy player link, plus the page's own link, marked as holding
  the answer.

### Pictures

Pictures come from [game-icons.net](https://game-icons.net/): 4,133 fantasy and game icons in SVG,
by Lorc, Delapouite and others, under CC BY 3.0 (a few are CC0). They're on GitHub as
`game-icons/icons` and on npm as `@iconify-json/game-icons`.

- A node can be a picture, words, or both. A picture sits at the rim end of its spoke, with any
  words running in from it.
- A build script writes each icon to `public/icons/` as its own file, plus a search index for the
  maker. A puzzle loads only the icons it uses, and links name them, so links stay short.
- SOURCES.md credits the icons' authors, as the license asks, and the site links to it.
- Picture pairs count either way round, as words do.

## Stack and hosting

- **Vite + React + TypeScript**, set up as Sator and Jabberwock are.
  - [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) deploys to GitHub Pages on
    every push to `main`, running the tests and the type check first.
  - Pushes to other branches run the same checks without deploying
    ([`.github/workflows/test.yml`](../.github/workflows/test.yml)).
  - Vite uses a relative `base`, so the same build works at `daedalus.invigoro.me`, at
    `invigoro.github.io/dm-puzzle-maker/`, or locally.
- **Node 24**, pinned in `.nvmrc` and used by CI. Anything from 22.12 up works locally.
- **Vitest** for the engines and the kit, and **Testing Library** for the pages.
- **No other libraries:** routing is a few lines over the URL's fragment, the board is SVG, and
  animation is CSS.
- **GitHub Pages** serves private repositories only on paid plans, so the repository goes public
  before the site can go live. Then:
  - set Settings → Pages → Source to GitHub Actions
  - set `daedalus.invigoro.me` as the custom domain, with a CNAME record for it pointing at
    `invigoro.github.io`
- **Fully static.** Nothing is sent anywhere.

## Project layout

```
.claude/skills/daedalus-dev/     # how to work on this repository, for Claude
.github/workflows/               # deploy.yml (main → Pages), test.yml (other branches)
index.html · vite.config.ts · package.json · .nvmrc · tsconfig.json
docs/PLAN.md                     # this file
public/                          # copied as-is: the favicon, and (Phase 3) icons
src/
  main.tsx · style.css           # opens the page the link holds
  kit/                           # shared by every kind of puzzle
    packing.ts                   # JSON ⇄ deflate-raw + base64url, as in Sator and Stele
    check.ts                     # salted PBKDF2 fingerprints, as in Sator
    rng.ts                       # seeded random numbers, as in Sator
    route.ts                     # which page a link opens, and the links to each
  puzzles/
    types.ts                     # what a kind of puzzle provides
    registry.ts                  # every kind of puzzle
    discs/
      engine/                    # no React, no DOM: layout, board, answer, scramble, filler
      Board.tsx                  # the board in SVG, for both pages
      maker.tsx · player.tsx     # the game master's side; the players' side
  ui/                            # the site's own pages: home, the page shells, a link that holds nothing
```

## Milestones

**Phase 0: Setup and deploy.** *(built; going live waits on the repository going public)*
- Vite + React + TypeScript, Node 24, Vitest and Testing Library, set up as Sator is.
- The kit's packing, fingerprints and random numbers from Sator, with their tests.
- The registry and the routes: home, maker and player pages, with each kind's code loaded only for
  its own page. Turning discs is registered, with a placeholder for each side.
- The home page, the README, and the deploy and test workflows.
- *Done when* a push to `main` updates the site. That waits on the repository going public (see
  [Stack and hosting](#stack-and-hosting)).

**Phase 1: The discs and the board.**
- The engine with tests: layout, board, turning and swapping, answer keys, scrambles, filler and the
  solver.
- The board in SVG with words on its spokes: turning, swapping, animation, Undo, Start over and the
  keyboard.
- A built-in example puzzle, with made-up names, to try it on.
- *Done when* a scrambled board can be solved by tapping, on a phone too.

**Phase 2: Make it, send it.**
- The maker: the words, the pairs, filler, scrambles, Any start and Preview as player.
- Player links with fingerprints, checked after every move. A solved board lights up and shows the
  game master's line, and progress is kept.
- The kit's page shells, so the next kind of puzzle gets them for free.
- Tests that a player link never gives the answer away, and that it fits in a Discord message.
- *Done when* the game master can make the realm's puzzle and paste the player link into the group's
  chat, and a player who solves it sees the line for solving it.

**Phase 3: Pictures and polish.**
- Icons from game-icons.net, with a picker in the maker, and SOURCES.md.
- Saved puzzles on the home page, kept in the browser, and exported and imported as a file.
- Setting the start by hand, on the board.
- A stone-and-bronze look for the board.
- An optional glow for each pair as it comes right (see [Risks](#risks)).
- *Done when* the realm's puzzle can be made with pictures for some halves, and found again from the
  home page.

**Backlog:**
- Checking by the game master, for the first kind of puzzle that needs it.
- More layouts of discs: three, as in the Defiled Temple, or nineteen.
- More kinds of puzzle: a cipher wheel, sliding tiles, a combination lock, lights out.
- Discs to print and cut out for the table.
- Links to Sator (an anagram as a node) and Stele.
- Pictures from a link, with a warning when the link's file name gives the answer away
  (`karn.png`).

## Risks

- **The answer leaking:** see [Keeping the answer secret](#keeping-the-answer-secret). A glow for
  each pair would let a player test one contact at a time, which is far quicker than guessing the
  whole board, so it's off unless the game master turns it on.
- **Small screens:** 42 spokes of letters is a lot for a phone. The board fills the width, halves
  are kept short, and the phone can be turned sideways. Phase 1 checks it at a phone's width.
- **Long links:** short halves and icon names keep a player link to about a thousand characters. A
  test holds it under 2,000.
- **Sending the wrong link:** the maker's own link holds the answer. The maker labels it, and keeps
  Copy player link in view.

## Decisions

- **The name:** Daedalus, who built the Labyrinth for King Minos. The repository keeps its name,
  dm-puzzle-maker.
- **React, as in Sator and Jabberwock:** the maker is forms, and the board is a small SVG.
- **The discs touch, rather than overlapping as the Defiled Temple's do.** Nothing is shared between
  discs, so the swap is what joins them.
- **A pair counts either way round.** Each half reads outward from its own hub, so there's no first
  half to get wrong. The puzzle is finding the names and their order, not the reading direction.
- **The order starts at a mark** by default, so it can follow the map. Any start is an option.
- **Six spokes a disc**, so every spoke can turn to every contact. That makes 42 nodes, 12 of them
  the answer.
- **Filler fills itself** unless the game master writes it.
- **Pictures come from a built-in icon set**, not uploads, so links stay short and pictures need no
  hosting.
- **Each kind of puzzle is two chunks**, one per side, so the players' page loads as little as it
  can.
- Everything runs in the browser, and nothing is sent anywhere.
- The deploy workflow doesn't cache dependencies, following setup-node's guidance for workflows
  that publish.
