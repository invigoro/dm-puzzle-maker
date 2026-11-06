# Sources

## Pictures

Halves on a disc, cells of a maze, traps and pedestals can have pictures. They come from two sets,
which the maker's picker searches together or one at a time, and a puzzle can mix them:

- [game-icons.net](#game-iconsnet): about 4,000 fantasy and game icons, made by many people.
- [Font Awesome](#font-awesome): 2,000 everyday icons, its free solid set.

A link names a game-icons picture as the set does (`stone-tower`), and a Font Awesome one with
`fa:` before it (`fa:key`), so links made before there was a second set still open as they did.

### game-icons.net

The icons of [game-icons.net](https://game-icons.net/), a set of fantasy and game icons made by many
people.

- **License:** [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), apart from those by
  Viscious Speed and Zeromancer, which are CC0. The set asks: "Please, include a mention 'Icons made
  by {author}' in your derivative work."
- **Credit:** each icon's file carries its author.
  - The maker's picker names each icon's maker.
  - Wherever a puzzle shows icons, the maker and the players' page say so: "Icons made by Lorc and
    Delapouite, from game-icons.net (CC BY 3.0)."
- **Where they come from:**
  - **The drawings:** the npm package
    [@iconify-json/game-icons](https://www.npmjs.com/package/@iconify-json/game-icons), version
    1.2.4, which holds the set's 4,134 icons as SVG paths.
  - **Who made each:** the set's repository, [game-icons/icons](https://github.com/game-icons/icons),
    where each contributor's icons are in a folder of their own. scripts/icon-authors.json records
    each folder's icons, from the repository's tree `82d948812bfe3f269ef8f731dcdb07b08160edc4`,
    fetched on 2026-11-01.
- **Which icons:** an icon's author is the folder it's in. 66 icons are left out, leaving 4,068:
  - those whose name is in more than one folder (63, nearly all shared with the `badges` folder),
    as their author is uncertain
  - those in a folder that isn't a person (`badges` and `various-artists`)
  - one that isn't in the repository at all (`female-vampire`)
- **Changes:** none to the drawings. Each is the package's paths in an SVG of its own, filled with
  the colour of the text around it.

#### Contributors

As the set's [license.txt](https://github.com/game-icons/icons/blob/master/license.txt) names them:

- [Lorc](http://lorcblog.blogspot.com)
- [Delapouite](http://delapouite.com)
- [John Colburn](http://ninmunanmu.com)
- [Felbrigg](http://blackdogofdoom.blogspot.co.uk)
- [John Redman](http://www.uniquedicetowers.com)
- [Carl Olsen](https://twitter.com/unstoppableCarl)
- [Sbed](http://opengameart.org/content/95-game-icons)
- PriorBlue
- [Willdabeast](http://wjbstories.blogspot.com)
- [Viscious Speed](http://viscious-speed.deviantart.com) (CC0)
- [Lord Berandas](http://berandas.deviantart.com)
- [Irongamer](http://ecesisllc.wix.com/home)
- [HeavenlyDog](http://www.gnomosygoblins.blogspot.com)
- Lucas
- [Faithtoken](http://fungustoken.deviantart.com)
- Skoll
- [Andy Meneely](http://www.se.rit.edu/~andy/)
- Cathelineau
- Kier Heyl
- Aussiesim
- [Sparker](http://citizenparker.com)
- Zeromancer (CC0)
- Rihlsul
- Quoting
- [Guard13007](https://guard13007.com)
- [DarkZaitzev](http://darkzaitzev.deviantart.com)
- SpencerDub
- GeneralAce135
- Zajkonur
- Catsu
- Starseeker
- Pepijn Poolman
- Pierre Leducq
- Caro Asercion
- SeregaCthtuf

### Font Awesome

The free solid icons of [Font Awesome](https://fontawesome.com/) 7, by Fonticons, Inc.

- **License:** the icons of Font Awesome Free are [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
  ([its terms](https://fontawesome.com/license/free)).
- **Credit:** the set is credited as a whole, as its own files are.
  - Each icon's file keeps the note Font Awesome's own files carry, naming the set, its version
    and its license, and has "Font Awesome" as its author, which the picker shows.
  - Wherever a puzzle shows its icons, the maker and the players' page say so: "Icons from Font
    Awesome (CC BY 4.0)", after game-icons.net's credit when there are both.
- **Where they come from:** the npm package
  [@iconify-json/fa7-solid](https://www.npmjs.com/package/@iconify-json/fa7-solid), version 1.2.5,
  which holds Font Awesome Free 7.3.0's 2,000 solid icons as SVG paths. The brand icons, which are
  companies' logos, aren't used, nor the regular set, as nearly all of its icons are outlines of
  solid ones.
- **Changes:** each drawing is scaled from Font Awesome's square of 640 to game-icons' square of
  512, so every picture is drawn the same way, and is otherwise as the package has it.

### Making them again

- `npm run icon-authors` fetches game-icons' list of files from GitHub, and writes
  scripts/icon-authors.json. Run it again when the game-icons package is updated, and commit what
  it writes.
- `scripts/build-icons.ts` runs before every `npm run dev` and `npm run build`. It writes
  public/icons/, which isn't committed: an SVG for each icon, with its author in it (Font Awesome's
  in `fa/`), and index.json for the picker. It does nothing when they're already up to date.

## Filler

The place-name halves that fill blank filler (ASH, THORN, WICK…) are common parts of English place
names, listed by hand in `src/puzzles/discs/engine/filler.ts`.
