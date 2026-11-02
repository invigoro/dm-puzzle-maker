import type { ReactNode } from 'react';

/** The frame of the game master's pages: the site's name, the page, and links to the sibling tools. */
export function Site({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="site">
      <header className="brand">
        {title ? (
          <>
            <a className="home" href="#">
              Daedalus
            </a>
            <h1>{title}</h1>
          </>
        ) : (
          <h1>Daedalus</h1>
        )}
      </header>
      <main>{children}</main>
      <About />
    </div>
  );
}

function About() {
  return (
    <footer className="about">
      <p>
        Scramble a password into an anagram with{' '}
        <a href="https://sator.invigoro.me/" target="_blank" rel="noopener">
          Sator
        </a>
        .
      </p>
      <p>
        Carve a clue in stone, or write it in an old letter, with{' '}
        <a href="https://stele.invigoro.me/" target="_blank" rel="noopener">
          Stele
        </a>
        .
      </p>
      <p>
        Write text in made-up languages with{' '}
        <a href="https://jabberwock.invigoro.me/" target="_blank" rel="noopener">
          Jabberwock
        </a>
        .
      </p>
      <p>
        <a href="https://github.com/invigoro/dm-puzzle-maker" target="_blank" rel="noopener">
          Source on GitHub
        </a>
      </p>
    </footer>
  );
}
