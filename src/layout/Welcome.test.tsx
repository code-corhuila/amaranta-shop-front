import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import welcomeCss from '../styles/welcome.css?raw';
import type { RemoteDefinition } from '../remotes/types';
import { SLIDE_SECONDS, WELCOME_PHOTOS, Welcome, photoUrl } from './Welcome';

const catalog: RemoteDefinition = { id: 'catalog', label: 'Catálogo', path: '/catalog', requiresSession: false, load: () => Promise.reject(new Error('not used')) };

function renderWelcome(remotes: readonly RemoteDefinition[] = [catalog]) {
  return render(
    <MemoryRouter>
      <Welcome remotes={remotes} />
    </MemoryRouter>,
  );
}

describe('the welcome', () => {
  it('names the shop, says in one line what it sells, and offers one way in: the catalog', () => {
    renderWelcome();
    expect(screen.getByRole('heading', { name: 'Amaranta Shop', level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/alimento, juguetes e higiene/i)).toBeInTheDocument();
    const way = screen.getByRole('link', { name: /bienvenido/i });
    expect(way).toHaveAttribute('href', '/catalog');
    // Said in words for a screen reader, who does not see the arrow or the photographs.
    expect(way).toHaveAccessibleName('Bienvenido, entrar al catálogo');
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('draws a photograph of a pet behind the words for each of the ones it has, and hides them from a screen reader', () => {
    const { container } = renderWelcome();
    const slides = container.querySelectorAll('.welcome-slide');
    expect(slides).toHaveLength(WELCOME_PHOTOS.length);
    expect(WELCOME_PHOTOS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(WELCOME_PHOTOS).size).toBe(WELCOME_PHOTOS.length);
    slides.forEach((slide, index) => {
      expect((slide as HTMLElement).style.backgroundImage).toContain(photoUrl(WELCOME_PHOTOS[index] as string));
    });
    expect(container.querySelector('.welcome-slides')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThan(0);
  });

  it('gives the stylesheet how many photographs there are and how long each stays, so there is one source for both', () => {
    const { container } = renderWelcome();
    const section = container.querySelector('.welcome') as HTMLElement;
    expect(section.style.getPropertyValue('--slides')).toBe(String(WELCOME_PHOTOS.length));
    expect(section.style.getPropertyValue('--slide')).toBe(`${SLIDE_SECONDS}s`);
  });

  it('credits the photographs', () => {
    renderWelcome();
    expect(screen.getByText(/fotos: unsplash/i)).toBeInTheDocument();
  });

  it('has no button when there is no catalog to go to, instead of one that leads nowhere', () => {
    renderWelcome([]);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Amaranta Shop' })).toBeInTheDocument();
  });
});

describe('the stylesheet of the welcome', () => {
  const rules = welcomeCss.replace(/\/\*[\s\S]*?\*\//g, '');

  it('has no colour of its own: every one is a token of the shell', () => {
    expect(rules).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(rules).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/);
  });

  it('gives whoever asks for less motion the first photograph, still, and the words where they go', () => {
    const reduced = rules.slice(rules.indexOf('prefers-reduced-motion'));
    expect(reduced).toMatch(/\.welcome-slide\s*\{[^}]*animation:\s*none/);
    expect(reduced).toMatch(/\.welcome-slide:first-child\s*\{[^}]*opacity:\s*1/);
    expect(reduced).toMatch(/\.welcome-cta[^{]*\{[^}]*animation:\s*none/);
  });

  it('never takes away the ring that shows the keyboard where it is', () => {
    expect(rules).not.toMatch(/outline\s*:\s*(none|0)\b/);
  });
});
