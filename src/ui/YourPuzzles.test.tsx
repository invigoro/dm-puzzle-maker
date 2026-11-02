// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readRoute } from '../kit/route';
import { exportFile, readExport, savedPuzzles, savePuzzle, type Saved } from '../kit/saved';
import { newDesign } from '../puzzles/discs/design';
import { Home } from './Home';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const entry = (id: string, title: string, saved: number): Saved => ({
  id,
  kind: 'discs',
  title,
  saved,
  design: { ...newDesign(), words: { title, intro: '', success: '' } },
});

describe('your puzzles', () => {
  it('says where puzzles will be kept, before there are any', () => {
    render(<Home />);
    expect(screen.getByText(/Puzzles you make are kept here/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export to a file' })).toBeDisabled();
  });

  it('lists the puzzles made here, newest first, each opening in the maker', async () => {
    savePuzzle(entry('vale', 'The Vale', 1));
    savePuzzle(entry('mill', 'The mill-wheel', 2));
    render(<Home />);
    // Links are made a moment after the list shows, as packing them takes a moment.
    await waitFor(() => expect(screen.getAllByRole('link', { name: /^The (Vale|mill-wheel)$/ })).toHaveLength(2));
    const links = screen.getAllByRole('link', { name: /^The (Vale|mill-wheel)$/ });
    expect(links.map((link) => link.textContent)).toEqual(['The mill-wheel', 'The Vale']);
    expect(links[1]).toHaveAttribute('href', expect.stringMatching(/^#m=/));
    const route = await readRoute(links[1].getAttribute('href')!, ['discs']);
    expect(route).toMatchObject({ page: 'make', kind: 'discs', id: 'vale' });
  });

  it('removes a puzzle, once asked twice', async () => {
    savePuzzle(entry('vale', 'The Vale', 1));
    render(<Home />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Remove The Vale' }));
    await user.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(savedPuzzles()).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Remove The Vale' }));
    await user.click(screen.getByRole('button', { name: 'Remove for good' }));
    expect(savedPuzzles()).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveTextContent('Removed The Vale.');
  });

  it('exports them to a file', async () => {
    savePuzzle(entry('vale', 'The Vale', 1));
    let file: Blob | null = null;
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: (blob: Blob) => ((file = blob), 'blob:puzzles'), revokeObjectURL: () => {} }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<Home />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Export to a file' }));
    expect(click).toHaveBeenCalled();
    expect(readExport(await file!.text())).toEqual(savedPuzzles());
  });

  it('imports them from a file, and says how many were new', async () => {
    savePuzzle(entry('vale', 'The Vale', 1));
    render(<Home />);
    const user = userEvent.setup();
    const file = new File([exportFile([entry('mill', 'The mill-wheel', 5), entry('tower', 'The tower', 4)])], 'puzzles.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText('Import from a file'), file);
    expect(await screen.findByText('Added 2 puzzles.')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByRole('link', { name: /^The / }).map((link) => link.textContent)).toEqual(['The mill-wheel', 'The tower', 'The Vale']),
    );
  });

  it('says so when a file isn’t Daedalus’s', async () => {
    render(<Home />);
    await userEvent.setup().upload(screen.getByLabelText('Import from a file'), new File(['{"hello": 1}'], 'other.json', { type: 'application/json' }));
    expect(await screen.findByText('That file doesn’t hold any puzzles of Daedalus’s.')).toBeInTheDocument();
  });
});
