import { useId, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import '@fontsource/noto-sans-runic/runic.css';
import { iconWords, useIcons } from '../../kit/icons';
import { ALPHABET, letterAt } from './engine/letters';
import type { Script } from './engine/rings';

/** The degrees between one letter and the next round the wheel. */
const STEP = 360 / 26;
/** The rings, in the wheel's own units: it's drawn on a square from -100 to 100. */
const RIM = 97;
const OUTER_IN = 75;
const INNER = 73;
const LETTERS_AT = 86;
const SYMBOLS_AT = 61;
const HUB = 46;
const PICTURE = 14;

/** A symbol as screen readers hear it: a letter, a rune, or a picture's name. */
export const symbolName = (script: Script, symbol: string) => (script === 'pictures' ? iconWords(symbol) : script === 'runes' ? `rune ${symbol}` : symbol);

interface WheelProps {
  script: Script;
  /** The inner ring's 26 symbols, from the place with the mark on. */
  ring: readonly string[];
  /** How far the inner ring's turned, as a count of letters: the mark sits under that letter of the outer ring, counting round. */
  turns: number;
  onTurn(by: number): void;
}

/** A point's angle from the wheel's middle, clockwise from the top, in degrees. */
const angleOf = (x: number, y: number) => (Math.atan2(x, -y) * 180) / Math.PI;

/**
 * The cipher wheel: the alphabet on its fixed outer ring, and the cipher's symbols on the inner
 * ring, which turns by dragging, by the arrow keys, or by the buttons below it. A mark on the
 * inner ring points at the outer letter it sits under, which is the wheel's setting.
 */
export function Wheel({ script, ring, turns, onTurn }: WheelProps) {
  const ids = `wheel${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ pointer: number; angle: number } | null>(null);
  const icons = useIcons(script === 'pictures' ? ring : []);
  const setting = ((turns % 26) + 26) % 26;
  const url = (name: string) => `url(#${ids}-${name})`;

  /** A pointer's place on the wheel, or null where the browser can't say (as in tests). */
  function pointOf(event: PointerEvent) {
    const matrix = svg.current?.getScreenCTM?.();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }

  function pointerDown(event: PointerEvent) {
    const at = event.button === 0 ? pointOf(event) : null;
    if (!at) return;
    drag.current = { pointer: event.pointerId, angle: angleOf(at.x, at.y) };
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
  }

  /** Dragging round turns the inner ring a letter each time the pointer passes halfway to the next. */
  function pointerMove(event: PointerEvent) {
    const held = drag.current;
    const at = held && event.pointerId === held.pointer ? pointOf(event) : null;
    if (!held || !at || Math.hypot(at.x, at.y) < 12) return;
    let delta = ((angleOf(at.x, at.y) - held.angle + 540) % 360) - 180;
    while (Math.abs(delta) > STEP / 2) {
      const by = Math.sign(delta);
      onTurn(by);
      held.angle += by * STEP;
      delta -= by * STEP;
    }
  }

  function pointerUp(event: PointerEvent) {
    if (drag.current?.pointer === event.pointerId) drag.current = null;
  }

  function key(event: KeyboardEvent) {
    const by = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[event.key];
    if (!by) return;
    event.preventDefault();
    onTurn(by);
  }

  /** Where each letter's slot ends: the lines between them. */
  const parts = (from: number, to: number) =>
    ALPHABET.split('').map((_, i) => {
      const angle = ((i + 0.5) * STEP * Math.PI) / 180;
      const [x, y] = [Math.sin(angle), -Math.cos(angle)];
      return <line key={i} x1={x * from} y1={y * from} x2={x * to} y2={y * to} />;
    });

  return (
    <div className="wheel">
      <svg ref={svg} viewBox="-100 -100 200 200" role="group" aria-label="The cipher wheel">
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
        </defs>
        <g className="outer" aria-hidden="true">
          <circle r={RIM} fill={url('hub')} stroke={url('bronze')} className="rim" />
          <g className="parts">{parts(OUTER_IN, RIM - 2)}</g>
          {ALPHABET.split('').map((letter, i) => (
            <text key={letter} className={i === setting ? 'letter marked' : 'letter'} transform={`rotate(${i * STEP}) translate(0 ${-LETTERS_AT})`}>
              {letter}
            </text>
          ))}
        </g>
        <g
          className="inner"
          role="slider"
          tabIndex={0}
          aria-label="The inner ring"
          aria-valuemin={0}
          aria-valuemax={25}
          aria-valuenow={setting}
          aria-valuetext={`The mark is under ${letterAt(setting)}, with ${symbolName(script, ring[0])} on it`}
          style={{ transform: `rotate(${turns * STEP}deg)` }}
          onKeyDown={key}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
        >
          <circle r={INNER} fill={url('stone')} stroke={url('bronze')} className="face" />
          <g className="parts">{parts(HUB, INNER - 2)}</g>
          <circle r={HUB} className="hub-line" />
          <g className="symbols" aria-hidden="true">
            {ring.map((symbol, place) => {
              const icon = icons.get(symbol);
              return (
                <g key={place} transform={`rotate(${place * STEP}) translate(0 ${-SYMBOLS_AT})`}>
                  {script === 'pictures' ? (
                    icon && <g transform={`translate(${-PICTURE / 2} ${-PICTURE / 2}) scale(${PICTURE / 512})`} dangerouslySetInnerHTML={{ __html: icon.body }} />
                  ) : (
                    <text className={script === 'runes' ? 'rune' : undefined}>{symbol}</text>
                  )}
                </g>
              );
            })}
          </g>
          {/* The mark, on the first symbol's place, pointing out at the letter it sits under. */}
          <path className="mark" d={`M0 ${-INNER - 1} L-3.4 ${-INNER + 5} L3.4 ${-INNER + 5} Z`} fill={url('bronze')} />
          <circle r={5} className="boss" fill={url('bronze')} />
        </g>
      </svg>
      <div className="wheel-turns">
        <button type="button" aria-label="Turn anticlockwise" onClick={() => onTurn(-1)}>
          ↺
        </button>
        <span className="setting">
          The mark is under <strong>{letterAt(setting)}</strong>
        </span>
        <button type="button" aria-label="Turn clockwise" onClick={() => onTurn(1)}>
          ↻
        </button>
      </div>
    </div>
  );
}
