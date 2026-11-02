/**
 * Sharing a player link: shortened, or as Discord shows a link by its title. Shortening is by is.gd,
 * a free shortener that needs no key and answers pages from anywhere. It's the only time the site
 * sends anything elsewhere, and only when the game master asks. is.gd keeps each link for good, so
 * only player links, which never hold the answer, go there.
 */
const SHORTENER = 'https://is.gd/create.php';

/** A short link, or what went wrong, to tell the game master. */
export type Shortened = { short: string } | { problem: string };

/** A link shortened by is.gd, keeping its fragment, where the puzzle is. */
export async function shorten(link: string): Promise<Shortened> {
  let answer: unknown;
  try {
    const response = await fetch(`${SHORTENER}?format=json&url=${encodeURIComponent(link)}`);
    answer = await response.json();
  } catch {
    return { problem: 'Couldn’t reach is.gd. Try again in a moment.' };
  }
  const { shorturl, errormessage } = answer && typeof answer === 'object' ? (answer as Record<string, unknown>) : {};
  if (typeof shorturl === 'string' && /^https:\/\/is\.gd\/[\w-]+$/.test(shorturl)) return { short: shorturl };
  return { problem: typeof errormessage === 'string' ? `is.gd says: ${errormessage.slice(0, 200)}` : 'is.gd didn’t send back a short link.' };
}

/** A link as Discord shows it, by its title alone: Markdown's [title](link), with no brackets in the title to break it. */
export function discordLink(title: string, link: string): string {
  return `[${title.replace(/[[\]]/g, '').trim()}](${link})`;
}
