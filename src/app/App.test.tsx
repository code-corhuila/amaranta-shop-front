import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionStore } from '../core/auth/session';
import { SessionProvider } from '../core/auth/SessionProvider';
import { NOW_SECONDS, validToken } from '../core/auth/testTokens';
import { createCartStore, type CartStore } from '../core/cart/cart';
import { CartProvider } from '../core/cart/CartProvider';
import type { RemoteDefinition } from '../remotes/types';
import { App } from './App';

const page = (text: string): { default: ComponentType } => ({ default: () => <p>{text}</p> });

function remote(overrides: Partial<RemoteDefinition> & Pick<RemoteDefinition, 'id'>): RemoteDefinition {
  return { label: overrides.id, path: `/${overrides.id}`, requiresSession: false, load: () => Promise.resolve(page(`Portal ${overrides.id}`)), ...overrides };
}

function renderApp(remotes: RemoteDefinition[], path = '/', cart: CartStore = createCartStore({ storage: null })) {
  const session = createSessionStore({ storage: null, now: () => NOW_SECONDS * 1000 });
  render(
    <SessionProvider store={session}>
      <CartProvider store={cart}>
        <MemoryRouter initialEntries={[path]}>
          <App remotes={remotes} />
        </MemoryRouter>
      </CartProvider>
    </SessionProvider>,
  );
  return session;
}

const croquetas = { productId: 'p-1', name: 'Croquetas', price: 189_000, priceFormatted: '$ 189.000', imageUrl: null };

describe('App', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it('shows the cart beside who is signed in, with how many units it holds, said in words for a screen reader', () => {
    const cart = createCartStore({ storage: null });
    renderApp([remote({ id: 'catalog', label: 'Catálogo' }), remote({ id: 'sales', label: 'Ventas' })], '/', cart);
    expect(screen.getByRole('link', { name: 'Carrito' })).toHaveAttribute('href', '/sales/cart');

    act(() => void cart.add(croquetas));
    expect(screen.getByRole('link', { name: 'Carrito, 1 producto' })).toBeInTheDocument();
    act(() => void cart.add(croquetas, 2));
    const link = screen.getByRole('link', { name: 'Carrito, 3 productos' });
    expect(within(link).getByText('3')).toBeInTheDocument();
  });

  it('has no cart where there is no sales portal to take it to', () => {
    renderApp([remote({ id: 'catalog', label: 'Catálogo' })]);
    expect(screen.queryByRole('link', { name: /^Carrito/ })).not.toBeInTheDocument();
  });

  it('names the application and offers each portal in the navigation', () => {
    renderApp([remote({ id: 'catalog', label: 'Catálogo' }), remote({ id: 'sales', label: 'Ventas' })]);
    expect(screen.getByRole('heading', { name: /amaranta shop/i })).toBeInTheDocument();
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByRole('link', { name: 'Catálogo' })).toHaveAttribute('href', '/catalog');
    expect(within(nav).getByRole('link', { name: 'Ventas' })).toHaveAttribute('href', '/sales');
  });

  it('loads a portal when its route is opened, and says it is loading meanwhile', async () => {
    let finish: (module: { default: ComponentType }) => void = () => undefined;
    renderApp([remote({ id: 'catalog', label: 'Catálogo', load: () => new Promise((resolve) => (finish = resolve)) })], '/catalog');
    expect(screen.getByRole('status')).toHaveTextContent(/cargando/i);
    finish(page('Portal catálogo'));
    expect(await screen.findByText('Portal catálogo')).toBeInTheDocument();
  });

  it('loads a portal only when its route is opened, not at start', () => {
    const load = vi.fn(() => Promise.resolve(page('x')));
    renderApp([remote({ id: 'catalog', load })], '/');
    expect(load).not.toHaveBeenCalled();
  });

  it('keeps working when a portal is down: only that area says so, and the other portal still opens', async () => {
    renderApp(
      [remote({ id: 'catalog', label: 'Catálogo', load: () => Promise.reject(new Error('remoteEntry.js 404')) }), remote({ id: 'sales', label: 'Ventas' })],
      '/catalog',
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('El módulo Catálogo no está disponible');
    expect(screen.getByRole('navigation')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: 'Ventas' }));
    expect(await screen.findByText('Portal sales')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('tries the load again when the person asks', async () => {
    const load = vi.fn<() => Promise<{ default: ComponentType }>>().mockRejectedValueOnce(new Error('down')).mockResolvedValue(page('Portal catálogo'));
    renderApp([remote({ id: 'catalog', label: 'Catálogo', load })], '/catalog');
    await userEvent.click(await screen.findByRole('button', { name: /reintentar/i }));
    expect(await screen.findByText('Portal catálogo')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('shows the 404 page for a route that does not exist, with the way home', async () => {
    renderApp([remote({ id: 'catalog' })], '/nada-por-aqui');
    expect(screen.getByRole('heading', { name: /404/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: /volver al inicio/i }));
    expect(screen.getByRole('heading', { name: /amaranta shop/i })).toBeInTheDocument();
  });

  it('sends a visitor who opens a portal that needs a session to the sign-in', async () => {
    renderApp([remote({ id: 'admin', label: 'Administración', requiresSession: true })], '/admin');
    expect(await screen.findByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.queryByText('Portal admin')).not.toBeInTheDocument();
  });

  it('shows who is signed in and lets them sign out', async () => {
    const session = renderApp([remote({ id: 'catalog' })]);
    expect(screen.getByRole('link', { name: /iniciar sesión/i })).toBeInTheDocument();
    session.signIn(validToken({ role: 'ADMIN' }));
    expect(await screen.findByText(/ADMIN/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }));
    expect(session.getSession()).toBeNull();
    expect(await screen.findByRole('link', { name: /iniciar sesión/i })).toBeInTheDocument();
  });
});
