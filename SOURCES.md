# Sources

## Pictures

A half on a disc can be a picture. The pictures are the icons of [game-icons.net](https://game-icons.net/),
a set of fantasy and game icons made by many people.

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

### Making them again

- `npm run icon-authors` fetches the repository's list of files from GitHub, and writes
  scripts/icon-authors.json. Run it again when the package is updated, and commit what it writes.
- `scripts/build-icons.ts` runs before every `npm run dev` and `npm run build`. It writes
  public/icons/, which isn't committed: an SVG for each icon, with its author in it, and index.json
  for the picker. It does nothing when they're already up to date.

### Contributors

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

## Filler

The place-name halves that fill blank filler (ASH, THORN, WICK…) are common parts of English place
names, listed by hand in `src/puzzles/discs/engine/filler.ts`.
