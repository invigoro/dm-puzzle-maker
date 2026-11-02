/** The words every puzzle has, whatever its kind. */
export interface Words {
  title: string;
  /** What the players read before they start: a riddle, an inscription, a hint at the answer. */
  intro: string;
  /** What they read once they've solved it: "The door grinds open." */
  success: string;
}

/** The longest each may be, as a player link has to fit in a chat message. */
export const LONGEST: Readonly<Record<keyof Words, number>> = { title: 100, intro: 600, success: 200 };

/** Words from untrusted data, each checked, with `fallback`'s for any that's missing or too long. */
export function readWords(data: unknown, fallback: Words): Words {
  const input = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  const field = (name: keyof Words) => {
    const value = input[name];
    return typeof value === 'string' && value.length <= LONGEST[name] ? value : fallback[name];
  };
  return { title: field('title'), intro: field('intro'), success: field('success') };
}

/** The words as players see them, with spaces trimmed from each end. */
export const tidyWords = ({ title, intro, success }: Words): Words => ({ title: title.trim(), intro: intro.trim(), success: success.trim() });
