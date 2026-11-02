import { Site } from './Site';

/** For a link that doesn't hold a puzzle this site knows: cut short in a chat, say, or mistyped. */
export function Lost() {
  return (
    <Site>
      <p className="message">This link doesn’t hold a puzzle. Ask whoever sent it for it again.</p>
      <p>
        <a href="#">Make a puzzle of your own</a>
      </p>
    </Site>
  );
}
