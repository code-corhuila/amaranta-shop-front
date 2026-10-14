import { describe, expect, it } from 'vitest';
import baseCss from './base.css?raw';
import tokensCss from './tokens.css?raw';

/**
 * The visual language is the one of the design system (`12-ux-ui/design-system.md` of amaranta-shop-docs, ADR-007 "Fiery
 * Ocean"). These read the CSS itself: the brand colours must be the ones the design system names, and every pair the
 * components draw text or a control with must be readable (WCAG 2.2 AA), which the design system says it never audited.
 */

function tokens(css: string): Map<string, string> {
  return new Map([...css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1] as string, (m[2] as string).trim()]));
}

const declared = tokens(tokensCss);

/** The value of a token, following `var(--other)` references until it is a literal. */
function value(name: string): string {
  let current = declared.get(name);
  for (let guard = 0; current !== undefined && guard < 10; guard += 1) {
    const reference = /^var\((--[\w-]+)\)$/.exec(current);
    if (!reference) return current;
    current = declared.get(reference[1] as string);
  }
  throw new Error(`token ${name} is not declared`);
}

function channel(hex: string, at: number): number {
  return parseInt(hex.slice(at, at + 2), 16) / 255;
}

function luminance(hex: string): number {
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(channel(hex, 1)) + 0.7152 * linear(channel(hex, 3)) + 0.0722 * linear(channel(hex, 5));
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

describe('the brand colours are the ones the design system names', () => {
  it.each([
    ['--color-ember-50', '#fdf1ee'],
    ['--color-ember-100', '#fbe0d8'],
    ['--color-ember-200', '#f3b8ac'],
    ['--color-ember-300', '#e8887a'],
    ['--color-ember-400', '#d85a4a'],
    ['--color-ember-500', '#c41e2e'],
    ['--color-ember-600', '#a01522'],
    ['--color-ember-700', '#7a0e17'],
    ['--color-ocean-50', '#eef5fa'],
    ['--color-ocean-500', '#5c93b8'],
    ['--color-ocean-600', '#457897'],
    ['--color-ocean-700', '#345d75'],
    ['--color-cream-50', '#fbeeda'],
    ['--color-cream-100', '#f5e2c4'],
    ['--color-ink-900', '#0e2a3d'],
  ])('%s is %s', (name, hex) => {
    expect(value(name)).toBe(hex);
  });

  it('uses Fredoka for what the brand says and Inter for what is read', () => {
    expect(value('--font-family-display')).toMatch(/^'Fredoka Variable'/);
    expect(value('--font-family-sans')).toMatch(/^'Inter Variable'/);
  });

  it('keeps the radii of the design system', () => {
    expect(value('--radius-lg')).toBe('8px');
    expect(value('--radius-xl2')).toBe('20px');
    expect(value('--radius-full')).toBe('9999px');
  });

  it('tints the shadow with the brand colour instead of pure black', () => {
    expect(value('--shadow-card')).toBe('0 8px 24px -8px rgba(61, 7, 9, 0.2)');
  });
});

describe('every pair the components draw is readable (WCAG 2.2 AA)', () => {
  const white = '#ffffff';
  const text: [string, string, string][] = [
    ['body text', '--color-ink-900', '--color-cream-50'],
    ['text on a white field', '--color-ink-900', '--surface'],
    ['muted text', '--color-ink-muted', '--color-cream-50'],
    ['headings', '--color-ember-700', '--color-cream-50'],
    ['links', '--link', '--color-cream-50'],
    ['primary button', '--on-accent', '--btn-primary-bg'],
    ['primary button, hovered', '--on-accent', '--btn-primary-bg-hover'],
    ['secondary button', '--btn-secondary-text', '--color-cream-50'],
    ['"Agregar" button', '--on-accent', '--btn-add-bg'],
    ['"Agregar" button, hovered', '--on-accent', '--btn-add-bg-hover'],
    ['error alert', '--alert-error-text', '--alert-error-bg'],
    ['success alert', '--alert-success-text', '--alert-success-bg'],
    ['error text beside a field', '--field-error', '--surface'],
  ];

  it.each(text)('%s has at least 4.5:1', (_name, foreground, background) => {
    const resolve = (token: string) => (token === '--on-accent' ? white : value(token));
    expect(contrast(resolve(foreground), resolve(background))).toBeGreaterThanOrEqual(4.5);
  });

  const controls: [string, string, string][] = [
    ['the border of a field on the page', '--field-border', '--color-cream-50'],
    ['the border of a field on a card', '--field-border', '--surface'],
    ['the border of the secondary button', '--btn-secondary-border', '--color-cream-50'],
  ];

  it.each(controls)('%s has at least 3:1 (the edge of a control)', (_name, foreground, background) => {
    expect(contrast(value(foreground), value(background))).toBeGreaterThanOrEqual(3);
  });
});

describe('the base styles keep the quality floor', () => {
  it('shows a visible focus ring for the keyboard', () => {
    expect(baseCss).toMatch(/:focus-visible/);
  });

  it('respects a person who asks for less motion', () => {
    expect(baseCss).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it('never uses pure black, as the design system asks', () => {
    // Comments may say the word; what is checked is the CSS itself.
    const rules = `${tokensCss}${baseCss}`.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(rules).not.toMatch(/#000(000)?\b|\bblack\b/i);
  });

  it('styles the roles the screens already use, so a portal needs no class for them', () => {
    expect(baseCss).toMatch(/\[role=['"]?alert['"]?\]/);
    expect(baseCss).toMatch(/\[role=['"]?status['"]?\]/);
    expect(baseCss).toMatch(/\[aria-invalid=['"]?true['"]?\]/);
  });
});
