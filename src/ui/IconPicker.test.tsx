// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetIcons } from '../kit/icons';
import { fakeIconFetch } from '../test/icons';
import { IconCredit } from './IconCredit';
import { IconPicker } from './IconPicker';

beforeEach(() => {
  vi.stubGlobal('fetch', fakeIconFetch);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  forgetIcons();
});

describe('the picker', () => {
  function open(value?: string) {
    const onPick = vi.fn();
    render(<IconPicker label="Picture for riddle 1" value={value} onPick={onPick} onClose={() => {}} />);
    return { user: userEvent.setup(), onPick };
  }

  it('searches every set at once, and picks from either', async () => {
    const { user, onPick } = open();
    expect(await screen.findByText('Search 3 pictures by name.')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Search the pictures' }), 'dragon');
    // Font Awesome's are named as such, as two sets can name a picture alike.
    const dragon = await screen.findByRole('button', { name: 'dragon, Font Awesome' });
    expect(dragon).toHaveAttribute('title', 'dragon, by Font Awesome');
    await user.click(dragon);
    expect(onPick).toHaveBeenCalledWith('fa:dragon');
  });

  it('searches one set on asking', async () => {
    const { user } = open();
    await screen.findByText('Search 3 pictures by name.');
    const which = screen.getByRole('combobox', { name: 'Which pictures' });
    await user.selectOptions(which, 'Font Awesome');
    expect(screen.getByText('Search 1 picture by name.')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Search the pictures' }), 'tower');
    expect(screen.getByText('No pictures called “tower”.')).toBeInTheDocument();
    await user.selectOptions(which, 'game-icons.net');
    expect(screen.getByRole('button', { name: 'stone tower' })).toBeInTheDocument();
  });

  it('starts from the words of the picture already chosen, whatever its set', async () => {
    open('fa:dragon');
    expect(screen.getByRole('searchbox', { name: 'Search the pictures' })).toHaveValue('dragon');
    expect(await screen.findByRole('button', { name: 'dragon, Font Awesome' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('the credit', () => {
  it('names each game-icons maker, and Font Awesome, with their licenses', async () => {
    render(<IconCredit names={['tower-flag', 'fa:dragon', 'stone-tower']} />);
    const credit = await screen.findByText(/^Icons made by/);
    expect(credit).toHaveTextContent('Icons made by Delapouite and Lorc, from game-icons.net (CC BY 3.0), and from Font Awesome (CC BY 4.0).');
    expect(screen.getByRole('link', { name: 'Font Awesome' })).toHaveAttribute('href', 'https://fontawesome.com/');
    expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/');
  });

  it('credits Font Awesome alone when only its icons are on show', async () => {
    render(<IconCredit names={['fa:dragon']} />);
    expect(await screen.findByText(/^Icons from/)).toHaveTextContent('Icons from Font Awesome (CC BY 4.0).');
  });

  it('says nothing when no icons are on show', () => {
    const { container } = render(<IconCredit names={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
