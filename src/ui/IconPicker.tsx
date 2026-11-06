import { useEffect, useState, type CSSProperties } from 'react';
import { ICON_SETS, iconUrl, iconWords, loadIndex, searchIcons, setOf, type IconIndex } from '../kit/icons';

/** An icon drawn in the text's colour, as a mask over it, so it suits light and dark alike. */
export const iconMask = (name: string): CSSProperties => {
  const url = `url("${iconUrl(name)}")`;
  return { maskImage: url, WebkitMaskImage: url };
};

/** An icon's name in the picker, which says the set too when it isn't game-icons: "key, Font Awesome". */
const choiceName = (name: string) => (setOf(name).prefix ? `${iconWords(name)}, ${setOf(name).name}` : iconWords(name));

interface IconPickerProps {
  /** What the picture is for, for screen readers: "Picture for name 1, first half". */
  label: string;
  value: string | undefined;
  onPick(icon: string | undefined): void;
  onClose(): void;
  /** Whether it offers No picture: not where there must be one. */
  optional?: boolean;
}

/** Choosing a picture from the icon sets, by searching their names, in every set or one. */
export function IconPicker({ label, value, onPick, onClose, optional = true }: IconPickerProps) {
  // Undefined while it loads, null if it couldn't.
  const [index, setIndex] = useState<IconIndex | null | undefined>(undefined);
  const [search, setSearch] = useState(value ? iconWords(value) : '');
  /** The set searched, by its prefix, or every set. */
  const [set, setSet] = useState<string | undefined>(undefined);
  useEffect(() => {
    let current = true;
    loadIndex().then((loaded) => current && setIndex(loaded));
    return () => {
      current = false;
    };
  }, []);
  const found = index ? searchIcons(index, search, { set }) : [];
  const authorOf = (name: string) => (index ? index.authors[index.by[index.names.indexOf(name)]] : '');
  const count = index ? index.names.filter((name) => set === undefined || setOf(name).prefix === set).length : 0;

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
        <select aria-label="Which pictures" value={set ?? 'every'} onChange={(event) => setSet(event.target.value === 'every' ? undefined : event.target.value)}>
          <option value="every">Every set</option>
          {ICON_SETS.map((each) => (
            <option key={each.prefix} value={each.prefix}>
              {each.name}
            </option>
          ))}
        </select>
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
      {index && search.trim() === '' && (
        <p className="hint">
          Search {count.toLocaleString('en')} {count === 1 ? 'picture' : 'pictures'} by name.
        </p>
      )}
      {index && search.trim() !== '' && found.length === 0 && <p className="hint">No pictures called “{search.trim()}”.</p>}
      {found.length > 0 && (
        <div className="icon-choices">
          {found.map((name) => (
            <button
              key={name}
              type="button"
              className="icon-choice"
              aria-label={choiceName(name)}
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
        , and from{' '}
        <a href="https://fontawesome.com/" target="_blank" rel="noopener">
          Font Awesome
        </a>
        , under{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">
          CC BY 4.0
        </a>
        . Each picture’s maker is named wherever it’s used.
      </p>
    </div>
  );
}
