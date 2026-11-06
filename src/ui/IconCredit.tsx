import { Fragment } from 'react';
import { creditsFor, useIcons } from '../kit/icons';

/**
 * Who made the icons on show, as their licenses ask: "Icons made by Lorc and Delapouite, from
 * game-icons.net (CC BY 3.0), and from Font Awesome (CC BY 4.0)."
 */
export function IconCredit({ names }: { names: readonly string[] }) {
  const credits = creditsFor(useIcons(names));
  if (credits.length === 0) return null;
  return (
    <p className="credit">
      Icons{' '}
      {credits.map(({ set, makers }, at) => (
        <Fragment key={set.prefix}>
          {at > 0 && ', and '}
          {makers && `made by ${makers}, `}from{' '}
          <a href={set.url} target="_blank" rel="noopener">
            {set.name}
          </a>{' '}
          (
          <a href={set.licenseUrl} target="_blank" rel="noopener">
            {set.license}
          </a>
          )
        </Fragment>
      ))}
      .
    </p>
  );
}
