import { memo, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { iconWords, useIcons, type Icon } from '../../kit/icons';
import { mulberry32 } from '../../kit/rng';
import { wordsOf, type Piece } from './engine/answer';
import type { Board as Pieces, Move } from './engine/board';
import { angleOf, angleTo, direction, discOf, positionOf, type Layout, type Point } from './engine/layout';

/** How long a move takes to show, in milliseconds. */
const DURATION = 280;
/** Room kept clear at a disc's rim for the swap buttons, and round its hub, on a disc of radius 100. */
const RIM = 15;
const HUB = 16;
/** Where the channel for a name runs along a spoke where names are read: under its letters, from the hub's room to the rim's. */
const LANE_IN = HUB;
const LANE_OUT = 100 - RIM;
/** The most room a letter takes along its spoke; longer halves get less, so they fit. */
const MOST_ADVANCE = 14;
/** A letter's size for the room it takes along its spoke: a capital's height, and a little space. */
const LETTER_SIZE = 1.22;
/** A picture's size, and how much further in than the last letter its middle sits: it stands at the rim end of its spoke. */
const ICON = 27;
const ICON_IN = 7;
/** A picture without words has the spoke to itself, so it's drawn larger. */
const ICON_ALONE = 40;
const ICON_ALONE_IN = 16;
/** How much further in a piece's words end when it has a picture, to clear it. */
const BESIDE_ICON = ICON_IN + ICON / 2 + 9;
/** Room round the discs, in board units. */
const MARGIN = 6;
/** Keys that turn a focused disc, and which way: Shift turns it back with Enter or Space. */
const TURN_KEYS: Partial<Record<string, number>> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Enter: 1, ' ': 1 };

/** A move to show happening: a new object each time, so the same move twice shows twice. */
export interface Motion {
  move: Move;
}

interface BoardProps {
  layout: Layout;
  pieces: readonly Piece[];
  board: Pieces;
  /** The move that made this board, to show; null to show it still. */
  motion: Motion | null;
  onMove(move: Move): void;
  /** Whether to point out where the answer starts. */
  mark: boolean;
  /** Whether the board is solved, so the pairs light up. */
  solved: boolean;
  /** The goal contacts whose names glow, when names glow as they come right. */
  lit?: readonly number[];
}

/** Where a piece is drawn: its letters run along `angle` from the pivot, the first nearest it, `reach` further out than at rest. */
interface Pose {
  x: number;
  y: number;
  angle: number;
  reach: number;
}

const ease = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
const animates = () => typeof matchMedia === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches;

/** How far through the latest motion the board is, from 0 to 1; 1 at rest. */
function useProgress(motion: Motion | null): number {
  const [progress, setProgress] = useState(1);
  // Before the browser paints, so a moved piece never shows in its new place first.
  useLayoutEffect(() => {
    if (!motion || !animates()) {
      setProgress(1);
      return;
    }
    setProgress(0);
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const done = Math.min(1, Math.max(0, (now - start) / DURATION));
      setProgress(done);
      if (done < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [motion]);
  return progress;
}

/** The discs, their pieces and the contacts between them, to turn and swap. */
export function Board({ layout, pieces, board, motion, onMove, mark, solved, lit = [] }: BoardProps) {
  const t = ease(useProgress(motion));
  const ids = `board${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ disc: number; pointer: number; angle: number; turned: boolean } | null>(null);
  // A drag that turned a disc ends in a click, which shouldn't turn it again.
  const dragged = useRef(false);

  const step = 360 / layout.spokes;
  const icons = useIcons(pieces.flatMap((piece) => (piece.icon ? [piece.icon] : [])));
  // Words without a picture share one size, set by the longest; words beside a picture get less room, so may be smaller.
  const roomFor = (piece: Piece) => 100 - RIM - HUB - (piece.icon ? BESIDE_ICON : 0);
  const fit = (piece: Piece) => Math.min(MOST_ADVANCE, roomFor(piece) / Math.max(1, [...wordsOf(piece)].length - 1));
  const advance = Math.min(...pieces.filter((piece) => !piece.icon).map(fit), MOST_ADVANCE);
  const advanceOf = (piece: Piece) => (piece.icon ? Math.min(advance, fit(piece)) : advance);
  const ends = (goal: number) => [layout.contacts[goal].a, layout.contacts[goal].b];
  const goals = new Set(layout.goals.flatMap(ends));
  const glowing = new Set(lit.flatMap((goal) => ends(layout.goals[goal])));
  const textAt = (position: number) => describe(pieces[board[position]]);

  /** Where the piece at a position is drawn, partway through the motion that brought it there. */
  function poseOf(position: number): Pose {
    const disc = layout.discs[discOf(layout, position)];
    const angle = angleOf(layout, position);
    const move = motion?.move;
    if (t < 1 && move?.kind === 'turn' && move.disc === discOf(layout, position)) {
      return { x: disc.x, y: disc.y, angle: angle - move.by * step * (1 - t), reach: 0 };
    }
    if (t < 1 && move?.kind === 'swap') {
      // The two pieces swing half a turn round the contact, each onto the other disc.
      const contact = layout.contacts[move.contact];
      const from = position === contact.a ? contact.b : position === contact.b ? contact.a : -1;
      if (from >= 0) return { x: contact.x, y: contact.y, angle: angleOf(layout, from) + 180 * t, reach: -disc.r };
    }
    return { x: disc.x, y: disc.y, angle, reach: 0 };
  }

  /** A pointer's place on the board, or null where the browser can't say (as in tests). */
  function pointOf(event: PointerEvent): Point | null {
    const matrix = svg.current?.getScreenCTM?.();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }

  function pointerDown(event: PointerEvent, disc: number) {
    dragged.current = false;
    const at = event.button === 0 && !drag.current ? pointOf(event) : null;
    if (!at) return;
    drag.current = { disc, pointer: event.pointerId, angle: angleTo(layout.discs[disc], at), turned: false };
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
  }

  /** Dragging round a disc turns it a spoke each time the pointer passes halfway to the next. */
  function pointerMove(event: PointerEvent) {
    const held = drag.current;
    const at = held && event.pointerId === held.pointer ? pointOf(event) : null;
    if (!held || !at) return;
    const disc = layout.discs[held.disc];
    if (Math.hypot(at.x - disc.x, at.y - disc.y) < disc.r * 0.15) return;
    let delta = ((angleTo(disc, at) - held.angle + 540) % 360) - 180;
    while (Math.abs(delta) > step / 2) {
      const by = Math.sign(delta);
      onMove({ kind: 'turn', disc: held.disc, by });
      held.angle += by * step;
      delta -= by * step;
      held.turned = true;
    }
  }

  function pointerUp(event: PointerEvent) {
    if (drag.current?.pointer !== event.pointerId) return;
    dragged.current = drag.current.turned;
    drag.current = null;
  }

  function click(event: MouseEvent, disc: number) {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    onMove({ kind: 'turn', disc, by: event.shiftKey ? -1 : 1 });
  }

  function discKey(event: KeyboardEvent, disc: number) {
    const by = TURN_KEYS[event.key];
    if (!by) return;
    event.preventDefault();
    onMove({ kind: 'turn', disc, by: event.shiftKey && (event.key === 'Enter' || event.key === ' ') ? -by : by });
  }

  function contactKey(event: KeyboardEvent, contact: number) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onMove({ kind: 'swap', contact });
  }

  const xs = layout.discs.flatMap((disc) => [disc.x - disc.r, disc.x + disc.r]);
  const ys = layout.discs.flatMap((disc) => [disc.y - disc.r, disc.y + disc.r]);
  const [left, top] = [Math.min(...xs) - MARGIN, Math.min(...ys) - MARGIN];
  const viewBox = `${left} ${top} ${Math.max(...xs) + MARGIN - left} ${Math.max(...ys) + MARGIN - top}`;
  const firstGoal = layout.contacts[layout.goals[0]];
  const turning = t < 1 && motion?.move.kind === 'turn' ? motion.move : null;

  // Each board's own names for its gradients and grain, as a page can show two boards.
  const url = (name: string) => `url(#${ids}-${name})`;

  return (
    <svg ref={svg} className={solved ? 'board solved' : 'board'} viewBox={viewBox} role="group" aria-label="The discs">
      <Stone ids={ids} />
      <g className="shadows" aria-hidden="true">
        {layout.discs.map((disc, d) => (
          <circle key={d} cx={disc.x} cy={disc.y + disc.r * 0.04} r={disc.r * 1.06} fill={url('shadow')} />
        ))}
      </g>
      {layout.discs.map((disc, d) => {
        const spokes = Array.from({ length: layout.spokes }, (_, spoke) => positionOf(layout, d, spoke));
        const turned = turning?.disc === d ? -turning.by * step * (1 - t) : 0;
        const lanes = spokes.filter((position) => goals.has(position)).map((position) => {
          const along = direction(angleOf(layout, position));
          const [from, to] = [LANE_IN, LANE_OUT].map((reach) => (reach * disc.r) / 100);
          return { position, x1: disc.x + from * along.x, y1: disc.y + from * along.y, x2: disc.x + to * along.x, y2: disc.y + to * along.y };
        });
        return (
          <g
            key={d}
            className={d === layout.hub ? 'disc hub' : 'disc'}
            role="button"
            tabIndex={0}
            aria-label={`Turn ${disc.name}: ${spokes.map(textAt).join(', ')}`}
            onClick={(event) => click(event, d)}
            onKeyDown={(event) => discKey(event, d)}
            onPointerDown={(event) => pointerDown(event, d)}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
          >
            <circle className="face" cx={disc.x} cy={disc.y} r={disc.r - 2} fill={url(d === layout.hub ? 'hub' : 'stone')} stroke={url('bronze')} />
            <circle className="grain" cx={disc.x} cy={disc.y} r={disc.r - 5} fill={url('grain')} />
            <circle className="bevel" cx={disc.x} cy={disc.y} r={disc.r - 5.5} />
            {/* Where the names are read: a channel down each such spoke, edged in gold, the edges drawn first so channels that meet run together. */}
            {lanes.length > 0 && (
              <g className="lanes">
                {['lane-edge', 'lane'].flatMap((part) => lanes.map(({ position, ...ends }) => <line key={`${part}-${position}`} className={part} {...ends} />))}
              </g>
            )}
            <g transform={`rotate(${turned} ${disc.x} ${disc.y})`}>
              {spokes.map((position) => {
                const along = direction(angleOf(layout, position));
                const [from, to] = [HUB * 0.55, disc.r - 7].map((reach) => (reach * disc.r) / 100);
                return (
                  <line key={position} className="spoke" x1={disc.x + from * along.x} y1={disc.y + from * along.y} x2={disc.x + to * along.x} y2={disc.y + to * along.y} />
                );
              })}
            </g>
            {/* The arrow, when it stands on a hub, stands where the hub's boss would be. */}
            {!(mark && d === layout.hub) && <circle className="boss" cx={disc.x} cy={disc.y} r={4.5} fill={url('bronze')} />}
          </g>
        );
      })}
      <g className="pieces" aria-hidden="true">
        {board.map((piece, position) => {
          const icon = pieces[piece].icon;
          return (
            <Letters
              key={piece}
              text={wordsOf(pieces[piece])}
              icon={icon ? (icons.get(icon) ?? null) : null}
              {...poseOf(position)}
              rim={100 - RIM - (icon ? BESIDE_ICON : 0)}
              advance={advanceOf(pieces[piece])}
              goal={goals.has(position)}
              lit={glowing.has(position)}
            />
          );
        })}
      </g>
      {mark && (
        <path
          className="mark"
          d="M0 -10 L5 -2.5 L1.8 -2.5 L1.8 6 L-1.8 6 L-1.8 -2.5 L-5 -2.5 Z"
          fill={url('bronze')}
          transform={`translate(${layout.mark.x} ${layout.mark.y}) rotate(${angleTo(layout.mark, firstGoal)})`}
        />
      )}
      {layout.contacts.map((contact, c) => (
        <g
          key={c}
          className={goals.has(contact.a) ? 'contact goal' : 'contact'}
          role="button"
          tabIndex={0}
          aria-label={`Swap ${textAt(contact.a)} and ${textAt(contact.b)}`}
          onClick={() => onMove({ kind: 'swap', contact: c })}
          onKeyDown={(event) => contactKey(event, c)}
        >
          {/* Wide enough for a finger, and still clear of the next contact, 100 units round the rim. */}
          <circle className="hit" cx={contact.x} cy={contact.y} r={20} />
          {goals.has(contact.a) && <circle className="ring" cx={contact.x} cy={contact.y} r={10.5} />}
          <circle className="dot" cx={contact.x} cy={contact.y} r={7.5} fill={url('bronze')} />
          <path
            className="arrows"
            d="M-4.5 0 H4.5 M-4.5 0 l2.4 -2.4 M-4.5 0 l2.4 2.4 M4.5 0 l-2.4 -2.4 M4.5 0 l-2.4 2.4"
            transform={`translate(${contact.x} ${contact.y}) rotate(${angleOf(layout, contact.a) - 90})`}
          />
        </g>
      ))}
    </svg>
  );
}

/** Specks of grain in the stone, the same on every board: x, y, radius and how dark, on a tile of 41. */
const GRAIN = (() => {
  const random = mulberry32(17);
  return Array.from({ length: 34 }, () => [random() * 41, random() * 41, 0.35 + random() * 0.9, 0.06 + random() * 0.22] as const);
})();

/**
 * The stone and bronze the discs are made of: gradients and a grain pattern, coloured from the
 * page's theme. They're drawn once, rather than as filters, so turning a disc stays cheap.
 */
const Stone = memo(function Stone({ ids }: { ids: string }) {
  return (
    <defs>
      <radialGradient id={`${ids}-stone`} cx="42%" cy="36%" r="72%">
        <stop offset="0" className="stone-light" />
        <stop offset="1" className="stone-dark" />
      </radialGradient>
      <radialGradient id={`${ids}-hub`} cx="42%" cy="36%" r="72%">
        <stop offset="0" className="hub-light" />
        <stop offset="1" className="hub-dark" />
      </radialGradient>
      <linearGradient id={`${ids}-bronze`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" className="bronze-light" />
        <stop offset="0.55" className="bronze-dark" />
        <stop offset="1" className="bronze-light" />
      </linearGradient>
      <radialGradient id={`${ids}-shadow`}>
        <stop offset="0.86" stopColor="#000" stopOpacity="0.2" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
      <pattern id={`${ids}-grain`} width="41" height="41" patternUnits="userSpaceOnUse">
        {GRAIN.map(([x, y, r, opacity], i) => (
          <circle key={i} className="speck" cx={x} cy={y} r={r} opacity={opacity} />
        ))}
      </pattern>
    </defs>
  );
});

/** A piece as screen readers hear it: its words, its picture, or both. */
export function describe(piece: Piece): string {
  const words = wordsOf(piece);
  if (!piece.icon) return words || 'nothing';
  const picture = `a picture of ${iconWords(piece.icon)}`;
  return words ? `${words} with ${picture}` : picture;
}

interface LettersProps extends Pose {
  text: string;
  /** The piece's picture, once it's loaded. */
  icon: Icon | null;
  /** How far out the last letter sits, at rest. */
  rim: number;
  advance: number;
  goal: boolean;
  /** Whether its name glows, being right. */
  lit: boolean;
}

/**
 * A piece's letters, one above the other along its spoke, the first nearest its disc's hub. Each
 * stands on the rim: its foot towards the rim end of the spoke, its head towards the hub. So two
 * halves meeting at a contact stand foot to foot, and each reads down from its own hub. A picture
 * stands the same way, at the rim end, with the letters running in from it.
 */
const Letters = memo(function Letters({ text, icon, x, y, angle, reach, rim, advance, goal, lit }: LettersProps) {
  const letters = [...text];
  const along = direction(angle);
  const at = (out: number) => [x + (out + reach) * along.x, y + (out + reach) * along.y];
  const [size, inward] = letters.length > 0 ? [ICON, ICON_IN] : [ICON_ALONE, ICON_ALONE_IN];
  const [ix, iy] = at(100 - RIM - inward);
  return (
    <g className={['piece', goal && 'goal', lit && 'lit'].filter(Boolean).join(' ')}>
      {icon && (
        <g
          className="icon"
          transform={`translate(${ix} ${iy}) rotate(${angle + 180}) translate(${-size / 2} ${-size / 2}) scale(${size / 512})`}
          dangerouslySetInnerHTML={{ __html: icon.body }}
        />
      )}
      {letters.map((letter, i) => {
        const [lx, ly] = at(rim - (letters.length - 1 - i) * advance);
        return (
          <text key={i} x={lx} y={ly} fontSize={advance * LETTER_SIZE} transform={`rotate(${angle + 180} ${lx} ${ly})`}>
            {letter}
          </text>
        );
      })}
    </g>
  );
});
