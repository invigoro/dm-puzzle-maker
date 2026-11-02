import { useEffect, useState, type CSSProperties } from 'react';
import { iconUrl, iconWords, loadIndex, searchIcons, type IconIndex } from '../kit/icons';

/** An icon drawn in the text's colour, as a mask over it, so it suits light and dark alike. */
export const iconMask = (name: string): CSSProperties => {
  const url = `url("${iconUrl(name)}")`;
  return { maskImage: url, WebkitMaskImage: url };
};

interface IconPickerProps {
  /** What the picture is for, for screen readers: "Picture for name 1, first half". */
  label: string;
  value: string | undefined;
  onPick(icon: string | undefined): void;
  onClose(): void;
  /** Whether it offers No picture: not where there must be one. */
  optional?: boolean;
}

/** Choosing a picture from the icon set, by searching its names. */
export function IconPicker({ label, value, onPick, onClose, optional = true }: IconPickerProps) {
  // Undefined while it loads, null if it couldn't.
  const [index, setIndex] = useState<IconIndex | null | undefined>(undefined);
  const [search, setSearch] = useState(value ? iconWords(value) : '');
  useEffect(() => {
    let current = true;
    loadIndex().then((loaded) => current && setIndex(loaded));
    return () => {
      current = false;
    };
  }, []);
  const found = index ? searchIcons(index, search) : [];
  const authorOf = (name: string) => (index ? index.authors[index.by[index.names.indexOf(name)]] : '');

  return (
    <div className="picker" role="group" aria-label={label}>
      <div className="row">
        <input
          type="search"
          aria-label="Search the pictures"
          placeholder="tower, bridge, raven…"
          value={search}
          autoFocus
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => event.key === 'Escape' && onClose()}
        />
        {value && optional && (
          <button type="button" onClick={() => onPick(undefined)}>
            No picture
          </button>
        )}
        <button type="button" onClick={onClose}>
          Done
        </button>
      </div>
      {index === undefined && <p className="hint">Loading the pictures…</p>}
      {index === null && <p className="warning">Couldn’t load the pictures. Try again in a moment.</p>}
      {index && search.trim() === '' && <p className="hint">Search {index.names.length.toLocaleString('en')} pictures by name.</p>}
      {index && search.trim() !== '' && found.length === 0 && <p className="hint">No pictures called “{search.trim()}”.</p>}
      {found.length > 0 && (
        <div className="icon-choices">
          {found.map((name) => (
            <button
              key={name}
              type="button"
              className="icon-choice"
              aria-label={iconWords(name)}
              aria-pressed={name === value}
              title={`${iconWords(name)}, by ${authorOf(name)}`}
              onClick={() => onPick(name)}
            >
              <span className="icon-thumb" style={iconMask(name)} />
            </button>
          ))}
        </div>
      )}
      <p className="hint">
        Pictures from{' '}
        <a href="https://game-icons.net/" target="_blank" rel="noopener">
          game-icons.net
        </a>
        , by Lorc, Delapouite and others, under{' '}
        <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">
          CC BY 3.0
        </a>
        . Each picture’s maker is named wherever it’s used.
      </p>
    </div>
  );
}
