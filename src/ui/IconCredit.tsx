import { creditFor, useIcons } from '../kit/icons';

/** Who made the icons on show, as their license asks: "Icons made by Lorc and Delapouite, from game-icons.net". */
export function IconCredit({ names }: { names: readonly string[] }) {
  const icons = useIcons(names);
  const credit = creditFor([...icons.values()].map((icon) => icon.author));
  if (!credit) return null;
  return (
    <p className="credit">
      {credit}, from{' '}
      <a href="https://game-icons.net/" target="_blank" rel="noopener">
        game-icons.net
      </a>{' '}
      (
      <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">
        CC BY 3.0
      </a>
      ).
    </p>
  );
}
