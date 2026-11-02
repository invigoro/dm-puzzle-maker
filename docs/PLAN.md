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

The discs have [a second layout](#more-layouts): three discs, as in the Defiled Temple. Three more
kinds of puzzle followed:
- a [word guess](#word-guess), tried a letter at a time
- a [maze](#maze) to find the way out of
- a [trapped floor](#trapped-floor) to cross by minesweeper's rules

A fifth is planned: [pedestals](#pedestals), each with a riddle, and objects to choose among and
set on them.

The site must be static, hosted on GitHub Pages, and everything runs in the browser.

**Current phase:** none. Phases 0 to 5 are done and live at https://daedalus.invigoro.me/. Phase 6,
the pedestals, is planned. What comes next is Tim's to choose, from the milestones and backlog under
[Milestones](#milestones), or elsewhere.

## The site

### Pages

- **Home** (`#`): the kinds of puzzle, each with a line on what it is, and the game master's
  puzzles: every puzzle made in this browser, saved as it's made, newest first. Each opens again, or
  can be removed (asked twice). **Export to a file** and **Import from a file** move them between
  browsers, keeping the newer of a puzzle in both.
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
  spells out the answer during a screen share. Once saved, it holds the puzzle's id among the saved
  puzzles too, so a bookmark and the saved puzzle stay one puzzle.
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
  - `problemsOf(design)`, which says what stops the design making a player link yet
  - `toPuzzle(design)`, which makes what a player link holds
  - the `Maker` component, for the kind's own part of the page
- **The player side** has `readPuzzle(data)` and the `Player` component.
- **Designs and puzzles** both carry the puzzle's `words`, so the page shells can show and edit
  them.
- **The `id`** is written into every link, so it's never renamed. It's lowercase letters and
  hyphens, so it can't be mistaken for `m=` or `p=`.
- **Each side** is its own chunk, loaded when its page opens.
- **What every kind shares** lives in `src/kit/`:
  - link packing, fingerprints, seeded random numbers and the routes
  - the puzzle's words (its title, its introduction and the line for solving it), and storage in
    the browser
  - the page shells: the maker page keeps the design in its address, and adds the words and
    **Send it** (Copy player link, Preview as player, Copy as a Discord link, Shorten with is.gd,
    the link's length, and a word about the page's own link); the players' page shows the title and
    introduction above the kind's puzzle
  - sharing (`share.ts`): a player link as Discord shows a link, `[title](link)`, and shortened by
    is.gd, which needs no key and answers pages from anywhere, and keeps the fragment

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
- **Some puzzles must show what they hide.** A word guess that marks each letter, a maze in the
  dark, or a trapped floor that counts the traps round each square: the players' page has to know
  what's there to show it, so the link holds it. It's packed, and where it can be, fingerprinted
  or sealed, so it's never plain to read. But a programmer reading the page's code could still
  work it out, and it would take far less effort than undoing the discs' fingerprints. The maker
  says so beside each choice that does this, and the game master decides.
- **Secret enough:** a link has to stand up to an ordinary player who might spot an obvious leak,
  such as the answer in plain text or an answer flag on a piece. It needn't stand up to a player
  set on reading the page's code or brute-forcing the fingerprints: nothing a static page does can
  stop that. So no kind goes out of its way to, and the maker's warnings stay short.

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
  clockwise, and Shift-click turns it back. Dragging it round turns it either way, a spoke each time
  the pointer passes halfway to the next.
- **Swapping:** where two discs touch, two nodes meet, one from each disc. Tapping the contact swaps
  them. It's the only way a node moves from one disc to another.
- **Lettering:** a half's letters stand one above the other along its spoke, with the first letter
  nearest its own disc's hub.
  - At a contact the two halves meet end to end. So the line from the centre's hub to the top disc's
    hub reads K A R N T S E R, each half read outward from its own hub.
  - A pair spells its name whichever disc holds which half, so there's no first half to get wrong,
    and swapping a right pair leaves it right.
  - Each letter stands on the rim: its foot towards the rim end of its spoke and its head towards
    the hub, so the two halves at a contact stand foot to foot. Letters turn with their disc.
  - Letters are all capitals, so case can't give away which half comes first in the name.
  - Letters are sized so the board's longest half fits its spoke: up to about seven letters read
    comfortably.

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

- **Layout:** the discs' centres and radii, where their spokes point, and the contacts, found where
  discs touch. The flower of seven and three discs are the layouts (see
  [More layouts](#more-layouts)).
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
- **Where the names are read:** each spoke that meets at a goal contact has a channel sunk along
  it, edged in gold, and the contact's stud has a gold ring, so the players can see where the
  answer goes. It gives nothing away, as the goal contacts are the layout's, not the puzzle's.
- **Moves:**
  - Tap a disc to turn it clockwise, Shift-click it to turn it back, or drag it round either way.
  - Tap a contact's ⇄ to swap.
  - From the keyboard, Tab picks a disc or a contact, arrow keys turn and Enter swaps.
  - Turns and swaps animate. A swap swings the two halves half a turn round their contact, each
    onto the other disc, so it reads as the flip it is.
- **Controls:** Undo, Start over, and a count of moves.
- **Solving:** when the board is solved, the six names light up and the game master's line shows
  ("The great door rumbles open.").
- **Checking on asking,** if the game master chooses it: the board isn't checked after every move,
  but when the players press Check the answer. A right check solves it as above. A wrong one says
  the game master's line for it ("The discs grind back, and darts fly from the walls"), or "That's
  not it", and is counted beside the moves. Each board is checked once, so the button waits for a
  move. The count, and a right check, are kept with the board. The link holds the same fingerprints
  as ever, so a programmer could check without asking; the button only keeps honest players
  honest.
- **Saving:** progress is kept in the browser, so a reload, or a week between sessions, doesn't lose
  the board.
- **No shared board:** with no server, each player has their own copy. One player can drive and
  share their screen, or the game master can put it on the table's screen.

### The maker

- **The words:** title, introduction (the riddle or the inscription), and the line for solving it.
- **The pairs:** six rows of first half and second half, in order from the mark. Halves of up to
  about seven letters fit their spokes, and longer ones are set smaller.
- **Any start:** off by default.
- **Glow:** off by default. It lights each name gold as it comes right. The player link then holds a
  fingerprint for each name, sorted: of the pair and its contact, or with any start, the pair
  alone. The players' page checks each centre contact after every move, making each contact's
  fingerprint once. Never with checking on asking, as it would tell the players a name at a time:
  the box is turned off, and the link holds no glows.
- **Checking:** after every move (the default), or when the players ask, with a line for a wrong
  check. Links made before there was a choice check after every move.
- **Start from the example:** while the names are blank, a button fills in the example's six
  made-up towns and its words, to see how it works.
- **Filler:** 30 boxes. Blank ones show, faintly, the half they'll be filled with, with 🎲 for
  another fill. Each blank has a half of its own, so writing a half elsewhere changes only the blank
  that had it.
- **Start:** every piece anywhere, or 20, 10 or 5 moves from solved, with 🎲 and the seed. Or set
  by hand: a board of its own, starting from the scramble as it was, where each turn and swap moves
  the start, with Start from solved and 🎲 Start from a scramble. It says how many names start in
  their places, as a hand-set start can leave some there. The design keeps the board, numbering
  pieces as the design does, so changing a half's words leaves it where it was.
- **Try it:** the board as the players will first see it, to play, or solved.
- **Links:** the player link is made a moment after the design last changed, with a new salt each
  time. Copy player link and Preview as player use it, and the page says how long it is, warning past
  2,000 characters. The page's own link is marked as holding the answer.

### Pictures

Pictures come from [game-icons.net](https://game-icons.net/): fantasy and game icons in SVG, by
Lorc, Delapouite and others, under CC BY 3.0 (a few are CC0). They're on GitHub as
`game-icons/icons` and on npm as `@iconify-json/game-icons`. [SOURCES.md](../SOURCES.md) has the
details.

- **On a spoke:** a node can be a picture, words, or both. A picture stands at the rim end of its
  spoke, foot to the rim like the letters, with any words running in from it. A picture alone is
  drawn larger.
- **In the maker:** 🖼 beside every half, names and filler alike, opens a picker that searches the
  icons' names.
- **Who made each:** the set's license asks for "Icons made by {author}", and the npm package
  doesn't say who made which. The set's repository keeps each contributor's icons in a folder of
  their own, so `npm run icon-authors` records each folder's icons, committed as
  scripts/icon-authors.json. Icons whose author is uncertain are left out: those in two folders,
  or in `badges` or `various-artists`. That leaves 4,068 of 4,134.
- **Serving them:** `scripts/build-icons.ts` writes each icon to `public/icons/` as its own file,
  with its author in it, plus an index for the picker. It runs before every dev server and build,
  and its output isn't committed. A puzzle loads only the icons it uses, and links name them, so
  links stay short.
- **Credit:** wherever a puzzle shows icons, the maker and the players' page name their makers.
- **Checking:** a piece's picture counts with its words, so a picture can't stand in for words, nor
  one picture for another. Pairs with pictures count either way round, as words do.
- **Drawing:** icons are drawn in the text's colour, inlined on the board and as CSS masks in the
  picker, so they suit light and dark alike.

### More layouts

*(Phase 4)* The game master chooses three discs or seven. Seven discs (the flower) is the board
so far, and three discs, as in the Defiled Temple, is the second layout. Layouts are data: discs,
their spokes, and the contacts the answer is read at. Two rules keep every scramble solvable:
- every disc joins the rest through contacts
- every contact sits at a spoke of both discs

`layoutOf` checks both. A test runs the solver on every layout.

- **Three discs:** three discs touching in a triangle, two above and one below.
  - Six spokes each, so 18 nodes.
  - The three contacts hold three names, read clockwise from the top one, with 12 filler.
  - A quick puzzle, for a door the party meets in the middle of a fight.
  - The triangle's contacts fall between an upright disc's spokes, so its spokes are turned half a
    step (30°). A layout says where its first spoke points.
- **Not nineteen:** a flower with a second ring of twelve was considered and dropped. A board that
  big would be too hard to solve, or too tedious to turn, to use in a game.

What changes:
- **Layouts by name:** a list of layouts, each with:
  - its id, written into links (`flower`, `trefoil`), and its name
  - its discs, and what each is called for screen readers ("the upper left disc")
  - where its first spoke points
  - its goal contacts, ordered clockwise round its mark from the top. The flower's are those round
    its centre disc, and three discs' are all three, as three discs have no hub.
- **The mark:** each layout says where its arrow stands: on the centre's hub for the flower, and in
  the gap between the three discs for three. It points at the first goal contact.
- **The maker:** a choice of three discs or seven, each with a small drawing, above the names.
  - The number of names and of filler follows the layout.
  - Names and filler beyond the layout's count are kept aside, in case the game master changes
    back, and the maker says so.
  - Switching layouts keeps a scramble, and a start set by hand begins again from a scramble.
- **Links:** designs and player links name their layout. A link without one is the flower, as
  every link made so far is.
- **The board:** it already fits its view to whatever discs there are, and sizes letters to the
  spoke.

## Word guess

*(Phase 5)* A word or phrase to guess in a set number of tries, each try telling the players which
letters are right. It suits a password at a door, a name, or the answer to the introduction's
riddle. It lives in `src/puzzles/word-guess/`, with the id `word-guess`.

### The game master's choices

- **The answer:** a word or a phrase. Its letters are compared in capitals, with accents taken off,
  as Sator does.
- **The letters:**
  - **Tiles:** the players get the answer's letters as tiles, shuffled, each to be used once, as on
    Sator's player page. A try is an arrangement of every tile.
  - **Any letters:** the players type each try, knowing only how long the answer is and where its
    words break. Hiding the word breaks is an option.
- **Tries:** one (the password spoken once), a few (six, say), or as many as they like.
- **What a try tells them:**
  - **Letter by letter:** each letter is in the right place, in the answer elsewhere, or not in it,
    counting repeated letters as the familiar game does. With tiles every letter is in the answer,
    so a try only tells them which are in the right place.
  - **Only right or wrong**, which keeps the answer far safer (see below).
- **Hints:** as many as the game master allows, a letter at a time, as Sator's hint ladder gives
  them.
- **Two lines:** one for solving it, and one for running out of tries ("Your voice echoes, and the
  door stays shut.").

### The players' page

- Rows of tries, each letter coloured by what it told them. Tiles are dragged or tapped into place,
  or letters typed, with an on-screen keyboard whose keys take the colours as they're learned.
- The tries made, and how many are left, are kept in the browser, so a reload doesn't give more.

### Keeping the answer secret

- **Only right or wrong:** the link holds fingerprints of the answer, as the discs' link does, and
  it's just as safe.
- **Letter by letter:** the page has to mark letters without the answer, so the link holds:
  - a fingerprint of each letter in each place
  - how many times each letter the answer has appears in it

  Each of these is quick to guess (26 tries a place), so a programmer could read the answer from
  the link in moments. A player at the table won't, and the maker says so beside the choice.
- A player who clears their browser gets their tries back. That's for the table to settle.

## Maze

*(Phase 5)* The players find their way through a maze, from its way in to a way out. It lives in
`src/puzzles/maze/`, with the id `maze`.

### The game master's choices

- **Size:** small, medium or large (say 8, 14 and 20 cells square), or numbers of their own.
- **The maze:**
  - **Made at random** from a seed, with 🎲: every cell reachable, and one path between any two.
    Twistiness can be set (long corridors, or many short dead ends), and so can loops: none for one
    way through, some for several.
  - **Or drawn by hand:** clicking between two cells puts up a wall or takes it down.
  - The maker shows the shortest way through ("64 steps"), and warns if a way out can't be reached.
- **The way in and the ways out:** cells on the edge or anywhere. There's one way in, and one way
  out or more, each with its own line: one leads on, another to the minotaur.
- **Light:**
  - **Lit:** the whole maze shows.
  - **Lantern:** the players see only the cells near them. The passages they've walked stay drawn,
    like a map they make as they go.
  - **Dark:** they see only the cells near them, and nothing stays drawn.
  - **How far they see,** by lantern or in the dark: up to 10 steps along the passages, never
    through a wall, so 2 in a straight passage is 2 cells ahead and 2 behind. With none at all, they
    see only the walls beside them. Mazes made before this could be chosen see 2 by lantern and none
    in the dark, as they did.
  - **Their view:** the whole maze, or a window 3 to 11 cells across with the party in its middle,
    the maze sliding under it as they move. Past the maze's edges looks like any cell not yet seen,
    so by lantern or in the dark only counting steps, and landmarks, tell them where they are. Lit,
    the edges show where the window runs past them.
- **Pictures** in cells, up to 20, from the icon set, each with a line said on reaching it, and
  never on the way in or a way out:
  - **Landmarks** to steer by (a statue, a fountain), shown when their cell is in sight.
  - **Hazards** to run into (a pit, the minotaur), shown when their cell is in sight, or hidden until
    the party runs into one.
  - When the party runs into a hazard, its line is said and they carry on, with the game master
    settling it at the table, or they go back to the way in.

### The players' page

- A token, moved with the arrow keys, by tapping a neighbouring cell, or by swiping. Steps are
  counted.
- Reaching a way out shows its line, and so does reaching a picture.
- Where they are and where they've been are kept in the browser, and so are the hidden hazards
  they've run into, as places they've stood.

### Keeping the answer secret

The maze is the puzzle, so the link holds its walls; in a lit maze the way through is in plain
sight anyway. With a lantern or in the dark, a programmer could still draw the whole maze from the
link, and players won't. The walls pack small, two bits a cell: a 20 by 20 maze is 100 bytes. The
link holds every picture too, so a programmer could find the hidden hazards.

## Trapped floor

*(Phase 5)* A room's floor of squares, some of them trapped, to cross by minesweeper's rules: a
safe square, once stepped on, shows how many of the eight squares round it are trapped. Diagonals
count, as on a D&D grid. It lives in `src/puzzles/trapped-floor/`, with the id `trapped-floor`.

### The game master's choices

- **The room:** its size in squares of 5 ft, so a 30 by 40 ft room is 6 by 8, up to about 20 by 20.
- **Where they start:** a square, or the whole of one side, as when they come through a wide
  doorway.
- **Where they're going:** a square (the door out, the chest), or the whole far side.
- **The traps:**
  - How many there are, placed at random from a seed (with 🎲), or by hand.
  - Never on the start, nor beside it, so the first step tells them something.
  - Each can be a kind, with its picture and a line for what it does: a pit, darts ("1d4 piercing,
    DC 12 Dexterity save for half"), a jet of fire.
- **Fair, or not:** a fair floor can always be crossed by reasoning, never by luck. The maker keeps
  placing traps until a solver, taking only the steps the counts prove safe, gets from the start to
  the goal. On an unfair floor the players may have to guess.
- **When someone steps on a trap:**
  - It's shown, its line is said, and they carry on, with the game master settling the damage at
    the table.
  - Or the floor resets and they go back to the start.
  - Or, after a number of traps, they fail, with a line for that.
- **How they move:** onto any square beside one they've stood on (the party spreads out), or only
  beside where they stand (one at a time, as a token).

### The players' page

- **The room:** a grid of flagstones. Squares stood on show their count, and a square with no traps
  round it opens the squares round it too, as minesweeper does.
- **Marking:** a square can be marked as a suspected trap, a chalk mark on the stone.
- **Reaching the goal** shows the line for solving it.
- **Progress:** traps sprung are counted, and kept in the browser with where they've been.

### Keeping the answer secret

The page has to say what's under any square a player steps on, so the link holds every square's
count, and whether it's a trap. Each square is masked separately, with a byte from a salted hash of
its place, so the link never shows the floor plainly. But the page can open any square, so a
programmer could open them all.

For a table that's all in one room, the game master can run it instead: their own page plays it on
their screen, and no link holds the floor at all.

## Pedestals

*(Phase 6, planned)* A room of pedestals, each with a riddle cut into it, and objects about the
room. The players choose the right object for each pedestal and set it there. A riddle reads "Place
the greatest weapon", and among a sword, a war axe and an olive branch, the olive branch is right.
It lives in `src/puzzles/pedestals/`, with the id `pedestals`.

### The game master's choices

- **The pedestals:** one to eight. Each has its riddle, and the one object that's right for it.
  - A riddle can be words, a picture from the icon set, or both.
  - So can an object.
- **Other objects:** up to twelve more, which are right for no pedestal: the sword and the war axe
  beside the olive branch. The best ones look as if they might be right.
- **The objects' places:** scattered on the floor in an order from a seed, with 🎲 for another,
  so the right ones don't come first.
- **Checking:**
  - **When all are right:** the pedestals unlock the moment each holds its object, with nothing
    said before. The players can try anything, at no cost.
  - **As each is placed:** each object is judged as it's set down. A right one settles into place
    and stays. A wrong one says the game master's line for it ("A gout of flame from the plinth"),
    is counted, and drops back to the floor.
  - **When they ask:** once every pedestal holds something, they press Check. A right check
    unlocks them. A wrong one says the game master's line, is counted, and tells them as much as
    the game master allows:
    - only that it's wrong
    - how many are right ("One of the three settles")
    - which are right: those pedestals glow
  - As with the discs, a set of objects is checked once, so Check waits for a change.
- **Failing:** if the game master likes, after so many wrong placements or checks the players
  fail, with a line for that, as on the trapped floor.
- **The lines:** for solving it, from the words; for a wrong placement or check; and for failing.

### The players' page

- **The room:** the pedestals in a row, wrapping on a phone, each a stone plinth with its riddle on
  a bronze plaque and an empty top. Below them, the objects on the floor.
- **Placing:** tap an object to pick it up, then tap a pedestal to set it there, or drag it.
  - A pedestal's object goes back to the floor when it's tapped, or when another is set there.
  - From the keyboard, Tab picks an object or a pedestal, and Enter picks up or sets down.
- **Check**, when checking on asking, and the count of wrong placements or checks.
- **Reaching the answer** unlocks the pedestals: they light up, and the line for solving it shows.
- **Progress:** what's on each pedestal, and the count, are kept in the browser.

### Keeping the answer secret

- The link lists the objects in their scattered order, with nothing to say which are right, or
  where they go.
- When the page only says right or wrong for the whole room (when all are right, or when they ask
  and hear only that), the link holds one slow fingerprint of the whole answer, and the line for
  solving it sealed with it.
- When it has to judge pedestals one at a time (as each is placed, or saying how many or which are
  right), the link holds a quick fingerprint of each pedestal with its object. With so few to try,
  a programmer could find them all, but a player reading the link sees nothing.

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
- **Fully static.** Nothing is sent anywhere, except a player link to is.gd when the game master
  asks for a short one. Only player links go, as is.gd keeps them for good, and they never hold
  the answer.

## Project layout

```
.claude/skills/daedalus-dev/     # how to work on this repository, for Claude
.github/workflows/               # deploy.yml (main → Pages), test.yml (other branches)
index.html · vite.config.ts · package.json · .nvmrc · tsconfig.json
docs/PLAN.md                     # this file
SOURCES.md                       # where the pictures come from, and who made them
scripts/                         # icon-authors.ts (by hand), build-icons.ts (before dev and build), icons.ts
public/                          # copied as-is: the favicon, and icons/ (written by build-icons.ts)
src/
  main.tsx · style.css           # opens the page the link holds
  kit/                           # shared by every kind of puzzle
    packing.ts                   # JSON ⇄ deflate-raw + base64url, as in Sator and Stele
    check.ts                     # salted PBKDF2 fingerprints, as in Sator
    rng.ts                       # seeded random numbers, as in Sator
    route.ts                     # which page a link opens, and the links to each
    words.ts                     # the title, introduction and line for solving it, read and checked
    storage.ts                   # things kept in the browser, when it allows
    icons.ts                     # pictures: loading, searching, crediting
    saved.ts                     # the game master's puzzles in this browser, and as a file
    kept.ts · seal.ts            # a player's progress per link; lines sealed with the answer
    share.ts                     # a player link for Discord, or shortened by is.gd
  puzzles/
    types.ts                     # what a kind of puzzle provides
    registry.ts                  # every kind of puzzle
    discs/
      engine/                    # no React, no DOM
        layout.ts                # discs, spokes and contacts; seven discs and three
        board.ts                 # which piece is on each spoke; turns and swaps
        answer.ts                # pieces, pairs, and answer keys that count either way round
        scramble.ts              # solved boards, full and light scrambles
        filler.ts                # place-name halves for blank filler
        solver.ts                # puts any board right, for tests
      Board.tsx                  # the board in SVG: drawing, animating, tapping, dragging, keys
      Game.tsx                   # the board with Undo, Start over, moves, and the line for solving it
      design.ts · Designer.tsx   # the game master's design, its player link, and the form for it
      puzzle.ts · Play.tsx       # what a player link holds, checked; the players' board, kept as they go
      example.ts                 # six made-up towns to start from
      maker.tsx · player.tsx     # each side as the registry loads it
    word-guess/
      engine/                    # letters, hints' order, and marking (from the answer, or from fingerprints)
      GuessGame.tsx              # rows of tries, the keyboard or tiles, hints, and the lines
      design.ts · Designer.tsx · puzzle.ts · Play.tsx · example.ts · maker.tsx · player.tsx
    maze/
      engine/                    # the grid and its numbered walls, making mazes, the way through, the lantern
      MazeBoard.tsx · MazeGame.tsx   # the maze drawn from above; walking it
      design.ts · Designer.tsx · puzzle.ts · Play.tsx · example.ts · maker.tsx · player.tsx
    trapped-floor/
      engine/                    # the room and its counts, placing traps, the fair-floor solver, masking
      FloorGame.tsx              # the floor of squares: stepping, chalk marks, sprung traps
      design.ts · Designer.tsx · puzzle.ts · Play.tsx · example.ts · maker.tsx · player.tsx
  ui/                            # the site's own pages
    Home.tsx · Lost.tsx · Site.tsx   # home, a link that holds nothing, and the game master's frame
    MakerPage.tsx · WordsFields.tsx · Send.tsx   # the maker's shell: the address, the words, sending
    IconPicker.tsx · IconCredit.tsx  # choosing a picture; naming who made the ones on show
    YourPuzzles.tsx              # the saved puzzles on the home page
    PlayerPage.tsx               # the players' shell: the title and introduction
    pages.tsx                    # which page a route opens, loading only its side's code
```

## Milestones

**Phase 0: Setup and deploy.** *(done)*
- Vite + React + TypeScript, Node 24, Vitest and Testing Library, set up as Sator is.
- The kit's packing, fingerprints and random numbers from Sator, with their tests.
- The registry and the routes: home, maker and player pages, with each kind's code loaded only for
  its own page. Turning discs is registered, with a placeholder for each side.
- The home page, the README, and the deploy and test workflows.
- *Done when* a push to `main` updates the site. That waits on the repository going public (see
  [Stack and hosting](#stack-and-hosting)).

**Phase 1: The discs and the board.** *(done. Moves are animated by working out where each letter
is, frame by frame, rather than by CSS transitions, so a swap can swing round its contact. Letters
stood upright at first, and now stand on the rim, as Tim asked. Shift-click, dragging and the arrow
keys turn a disc back, so it needs no ↺ handle. The example lives on the turning discs page until
Phase 2's maker takes it over, and the line for solving it stays once said, even if a player
carries on turning.)*
- The engine with tests: layout, board, turning and swapping, answer keys, scrambles, filler and the
  solver.
- The board in SVG with words on its spokes: turning, swapping, animation, Undo, Start over and the
  keyboard.
- A built-in example puzzle, with made-up names, to try it on.
- *Done when* a scrambled board can be solved by tapping, on a phone too.

**Phase 2: Make it, send it.** *(done. The example became a button in the maker, Start from the
example. The player link is made as the design changes rather than on asking, so the page can show
its length; a full one comes to about 700 characters. The page shells take the words from every
kind's design and puzzle, so a kind only says what's its own, and what stops it being sent. Light
scrambles are 20, 10 or 5 moves from solved.)*
- The maker: the words, the pairs, filler, scrambles, Any start and Preview as player.
- Player links with fingerprints, checked after every move. A solved board lights up and shows the
  game master's line, and progress is kept.
- The kit's page shells, so the next kind of puzzle gets them for free.
- Tests that a player link never gives the answer away, and that it fits in a Discord message.
- *Done when* the game master can make the realm's puzzle and paste the player link into the group's
  chat, and a player who solves it sees the line for solving it.

**Phase 3: Pictures and polish.** *(done. The icon package doesn't say who made which icon, so
each icon's author comes from its folder in the set's repository, and the 66 whose author is
uncertain are left out. The icons are written at build time rather than committed. Puzzles are
saved as they're made, rather than on asking, and the maker's address holds each one's id. Setting
the start by hand has a board of its own, which says how many names start in their places. The
stone and bronze are gradients and a grain pattern rather than live filters, so turning a disc stays
cheap, and slate in the dark theme.)*
- Icons from game-icons.net, with a picker in the maker, and SOURCES.md.
- Saved puzzles on the home page, kept in the browser, and exported and imported as a file.
- Setting the start by hand, on the board.
- A stone-and-bronze look for the board.
- An optional glow for each pair as it comes right (see [Risks](#risks)).
- *Done when* the realm's puzzle can be made with pictures for some halves, and found again from the
  home page.

**Phase 4: Three discs or seven.** See [More layouts](#more-layouts). *(done. Nineteen discs was
dropped before it was built. A design keeps six names and 30 filler whatever its layout, and three
discs use the first of them, so changing back loses nothing. The maker writes counts in words ("Six
names start in their places"). Each layout has its own example to start from. A three-disc player
link comes to about 520 characters.)*
- Layouts by name, each with its discs, where its spokes point, its goal contacts in order, and its
  mark. The design, the player link, the board and the maker take the layout, rather than assuming
  the flower.
- Three discs, as in the Defiled Temple, alongside the seven.
- In the maker, a choice of three discs or seven, with a small drawing of each. The names and the
  filler follow the layout's count, and an example for each layout.
- Designs and player links name their layout, and links that don't are the flower.
- Tests that every layout's scrambles can be solved, and that a link made before layouts still
  opens and checks as it did.
- *Done when* a three-disc puzzle can be made, sent and solved, on a phone too, and a seven-disc one
  still can.

**Phase 5: More kinds of puzzle.** Each is a folder and a registry entry, as
[Kinds of puzzle](#kinds-of-puzzle) says, with its own engine and tests. Each part below is done on
its own, in this order.

- **5a. Word guess.** See [Word guess](#word-guess). *(done. Letter marks use a quick salted
  hash, not the slow one, as they're quick to guess however they're hashed, and a slow one would
  only slow each try. The line for solving it is sealed with the answer, as the kit's sealing does.
  Marks are blue for the right place and gold for elsewhere, which colour-blind players tell apart
  more easily than green and yellow. A link comes to about 800 characters.)*
  - The answer, tiles or any letters, the number of tries, letter-by-letter marking or only right
    or wrong, hints, and the two lines.
  - The players' rows of tries, with tiles or typing and an on-screen keyboard, and the tries kept
    in the browser.
  - The marking rules, with repeated letters counted as the familiar game counts them, and tests
    that a link marking only right or wrong never holds the answer.
  - The maker's warning beside letter-by-letter marking.
  - *Done when* a password door with six tries and letter-by-letter marking can be made, sent and
    solved, and so can a one-try riddle with tiles.
- **5b. Maze.** See [Maze](#maze). *(done. Winding mazes come from a walk that backs up when it's
  cornered, and branching ones grow outwards a wall at a time; loops are a few walls taken down
  after. Drawing by hand keeps the walls flipped from the seed's maze, so a new seed starts afresh.
  The lantern lights two steps along the passages, not through walls. A new size starts the ways
  in and out again at the corners, as walls are numbered by size. Each maze link has a salt of its
  own, just to keep its players' progress apart. Pictures in cells came after Phase 5, below. A 14
  by 14 link comes to about 520 characters.)*
  - Mazes made from a seed, with twistiness and loops, or drawn by hand, and the shortest way
    through.
  - The way in, the ways out with a line each, light (lit, lantern or dark), and pictures in cells.
  - The players' token, moved by keys, taps or swipes, with progress kept.
  - *Done when* a 14 by 14 maze lit by a lantern can be made, sent and walked on a phone, and the
    line shows at the way out.
- **5c. Trapped floor.** See [Trapped floor](#trapped-floor). *(done. The solver that keeps a
  floor fair reads each count on its own, then compares counts whose squares overlap; the maker
  places traps up to 300 times for a fair floor, and says when none turns up, or which hand-placed
  floor needs a guess. A single square as the goal is kept clear too. Squares are masked with a
  salted hash rather than sealed one by one, as each is opened by stepping on it anyway. Going back
  to the start keeps the sprung traps showing, so a party isn't made to find them twice. Up to six
  kinds of trap, each trap one of them at random. Marking is a toggle, or a right-click. Running it
  for the table is a full-size dialog in the maker. An 8 by 10 link comes to about 800 characters,
  and a 20 by 20 one fits in a Discord message.)*
  - The room, the start and the goal (a square or a side), traps placed from a seed or by hand, and
    the kinds of trap with their pictures and lines.
  - The solver that keeps a fair floor fair, what happens when a trap is sprung, and how the party
    moves.
  - The players' floor: counts, squares with no traps round them opening their neighbours, chalk
    marks, and progress kept.
  - Running it from the game master's own screen, for a table that's all in one room.
  - *Done when* a fair 8 by 10 floor, crossed from one side to the other, can be made, sent and
    crossed on a phone, and a sprung trap's line is said.
- **The kit, along the way:** *(done with the word guess)*
  - Progress and tries kept per link, shared by every kind (`kit/kept.ts`), as the discs keep theirs
    now.
  - Sealing (`kit/seal.ts`): the line for solving a puzzle encrypted (AES-GCM) with a key made
    slowly from its answer, so only solving it opens it. The word guess uses it; the discs could
    take it too.
  - A quick fingerprint (`quickFingerprint`, one salted SHA-256) beside the slow one, for what's
    quick to guess anyway.

**After Phase 5.** Smaller changes Tim asked for once it was live. *(done)*
- The maze: how far the players see, by lantern or in the dark, from none to 10 steps.
- The discs: where the names are read, shown by a gold-edged channel down each spoke that meets
  there, and a gold ring round its stud.
- The maze: pictures in cells, as landmarks, hazards and hidden hazards, and a window round the
  party that never shows the maze's edges. A hidden hazard shows itself once stood on, so it needs
  nothing kept beyond where the party has been. The 14 by 14 example, with three pictures, makes a
  link of about 760 characters.
- Sending: Copy as a Discord link, which Discord shows by the puzzle's title, and Shorten with
  is.gd. A short link is for the player link it was made from, so it goes when the design changes,
  and the Discord link uses it once there is one.
- The discs: checking on asking, so each wrong guess can cost the players, with the game master's
  line for a wrong check and a count of them.

**Phase 6: Pedestals.** See [Pedestals](#pedestals). *(planned)*
- The engine with tests: the answer, judging a set of objects whole or a pedestal at a time, how
  many and which are right, and the objects' scatter from a seed.
- The maker: the pedestals with their riddles and objects, the other objects, words or pictures for
  each, the scatter with 🎲, checking, what a wrong one tells them, failing, the lines, and an
  example of made-up riddles.
- The players' room: pedestals and the floor, placing by taps, drags or keys, Check, the count, and
  progress kept.
- Player links holding one slow fingerprint and a sealed line, or a quick fingerprint for each
  pedestal, as checking needs, with tests that neither gives away which object goes where.
- *Done when* three pedestals with three other objects can be made, sent and solved on a phone:
  once unlocking when all are right, once judging each as it's placed with a trap's line, and once
  checking on asking, telling how many are right.

**Backlog:**
- Checking by the game master, for the first kind of puzzle that needs it.
- More kinds of puzzle: a cipher wheel, sliding tiles, a combination lock, lights out.
- Round labyrinths for the maze, in rings like the one on the favicon.
- Word guess: tries that must be real words, from Sator's word lists.
- Discs to print and cut out for the table, and mazes and floors to print as handouts.
- Links to Sator (an anagram as a node) and Stele.
- Pictures from a link, with a warning when the link's file name gives the answer away
  (`karn.png`).

## Risks

- **The answer leaking:** see [Keeping the answer secret](#keeping-the-answer-secret). The glow
  lets a player test one contact at a time, which is far quicker than guessing the whole board
  (about 1,700 pairs to try a contact, against some 10¹⁷ boards), so it's off unless the game
  master turns it on, and the maker says why.
- **Puzzles that show what they hide:** a word guess's letter-by-letter marking, a maze in the dark
  and a trapped floor all put in the link what the page must show, as
  [Keeping the answer secret](#keeping-the-answer-secret) says. The maker says so where it applies,
  and the trapped floor can be run from the game master's screen instead.
- **Small screens:** 42 spokes of letters is a lot for a phone. The board fills the width, halves
  are kept short, and the phone can be turned sideways. Phase 1 checks it at a phone's width.
  The largest mazes and floors will need zooming in, and perhaps panning.
- **A game's rules and a game's name:** the word guess and the trapped floor follow well-known
  games' rules, which is fine, but they're named for what they are, not after those games.
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
- **Three discs or seven, and no bigger:** nineteen discs was dropped, as a board that big would be
  too hard to solve, or too tedious to turn, to use at the table.
- **Layouts before new kinds** (Phase 4 before 5): they build on what's there, and making the
  engine take any layout tidies the discs' code before the next kind copies its shape.
- **Word guess first among the new kinds:** it's closest to what Sator already does, tiles and
  all, so it tests the kit's shells on a second kind with the fewest new parts.
- Everything runs in the browser, and nothing is sent anywhere.
- The deploy workflow doesn't cache dependencies, following setup-node's guidance for workflows
  that publish.
