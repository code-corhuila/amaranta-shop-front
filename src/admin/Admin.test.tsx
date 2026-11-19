import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { createSessionStore } from '../core/auth/session';
import { SessionProvider } from '../core/auth/SessionProvider';
import { NOW_SECONDS, validToken } from '../core/auth/testTokens';
import { createCartStore } from '../core/cart/cart';
import { CartProvider } from '../core/cart/CartProvider';
import { ApiError } from '../core/http/apiError';
import type { ApiClient } from '../core/http/apiClient';
import { AdminHome } from './AdminHome';
import { UsersPage } from './UsersPage';

const refuse = () => Promise.reject(new Error('not used'));

function clientThatAnswers(get: ApiClient['get']): ApiClient {
  return { get, post: refuse, put: refuse, patch: refuse, delete: refuse };
}

const answer = (data: unknown) => Promise.resolve({ status: 200, location: null, data });

const user = (n: number, overrides: Record<string, unknown> = {}) => ({
  userId: `u-${n}`,
  fullName: `Persona ${n}`,
  email: `persona${n}@correo.com`,
  phone: '3001234567',
  role: 'CUSTOMER',
  createdAt: '2026-10-14T15:00:00Z',
  ...overrides,
});

const page = (rows: unknown[], meta: Record<string, number> = {}) => ({
  data: rows,
  meta: { page: 1, limit: 20, total: rows.length, totalPages: rows.length === 0 ? 0 : 1, ...meta },
});

describe('the users of the shop, for the administrator', () => {
  it('lists who has registered, with the role in words, and never a password', async () => {
    const get = vi.fn().mockReturnValue(answer(page([user(1), user(2, { role: 'ADMIN', phone: null })])));
    render(
      <MemoryRouter>
        <UsersPage client={clientThatAnswers(get)} />
      </MemoryRouter>,
    );

    const table = await screen.findByRole('table');
    expect(get).toHaveBeenCalledWith('/api/v1/admin/users?page=1&limit=20', expect.anything());
    expect(within(table).getByText('2 usuarios en total')).toBeInTheDocument();
    const rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0]!).getByText('persona1@correo.com')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('Cliente')).toBeInTheDocument();
    expect(within(rows[0]!).getByText(/oct/i)).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Administrador')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('—')).toBeInTheDocument();
    expect(table.textContent).not.toMatch(/password|contraseña|hash/i);
  });

  it('asks the next page when the administrator moves on', async () => {
    const get = vi.fn().mockReturnValue(answer(page([user(1)], { total: 30, totalPages: 2 })));
    render(
      <MemoryRouter>
        <UsersPage client={clientThatAnswers(get)} />
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /siguiente/i }));
    expect(get).toHaveBeenLastCalledWith('/api/v1/admin/users?page=2&limit=20', expect.anything());
  });

  it('says what went wrong in the words of the shell, and lets the administrator try again', async () => {
    const get = vi
      .fn()
      .mockRejectedValueOnce(new ApiError({ status: 503, code: 'SERVICE_UNAVAILABLE', message: 'class X exploded', traceId: 't' }))
      .mockReturnValue(answer(page([user(1)])));
    render(
      <MemoryRouter>
        <UsersPage client={clientThatAnswers(get)} />
      </MemoryRouter>,
    );
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/servicio no está disponible/i);
    expect(alert).not.toHaveTextContent(/exploded/);
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('says so when nobody has registered yet', async () => {
    render(
      <MemoryRouter>
        <UsersPage client={clientThatAnswers(vi.fn().mockReturnValue(answer(page([]))))} />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/todavía no se ha registrado nadie/i)).toBeInTheDocument();
  });
});

describe('the front door of the administration', () => {
  it('offers the catalog, the orders and the users, each with how many there are', async () => {
    const get = vi.fn((path: string) => {
      if (path.startsWith('/api/v1/admin/products')) return answer(page([], { total: 10 }));
      if (path.startsWith('/api/v1/admin/orders')) return answer(page([], { total: 1 }));
      return answer(page([], { total: 4 }));
    });
    render(
      <MemoryRouter>
        <AdminHome client={clientThatAnswers(get as unknown as ApiClient['get'])} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('10 productos')).toBeInTheDocument();
    expect(screen.getByText('1 pedido')).toBeInTheDocument();
    expect(screen.getByText('4 usuarios')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /catálogo/i })).toHaveAttribute('href', '/catalog/admin');
    expect(screen.getByRole('link', { name: /pedidos/i })).toHaveAttribute('href', '/sales/admin/orders');
    expect(screen.getByRole('link', { name: /usuarios/i })).toHaveAttribute('href', '/admin/users');
  });

  it('still opens when a count cannot be had: it says so instead of showing a wrong number', async () => {
    const get = vi.fn().mockRejectedValue(new Error('down'));
    render(
      <MemoryRouter>
        <AdminHome client={clientThatAnswers(get)} />
      </MemoryRouter>,
    );
    expect((await screen.findAllByText('No se pudo contar')).length).toBe(3);
  });
});

describe('who may enter the administration', () => {
  function renderAt(path: string, role: string | null) {
    const session = createSessionStore({ storage: null, now: () => NOW_SECONDS * 1000 });
    if (role !== null) session.signIn(validToken({ role }));
    render(
      <SessionProvider store={session}>
        <CartProvider store={createCartStore({ storage: null })}>
          <MemoryRouter initialEntries={[path]}>
            <App remotes={[]} />
          </MemoryRouter>
        </CartProvider>
      </SessionProvider>,
    );
  }

  it('turns a customer away from the users, without showing the screen', () => {
    renderAt('/admin/users', 'CUSTOMER');
    expect(screen.getByRole('alert')).toHaveTextContent(/no tienes permiso/i);
    expect(screen.queryByText('Usuarios registrados')).not.toBeInTheDocument();
  });

  it('turns a customer away from the front door too', () => {
    renderAt('/admin', 'CUSTOMER');
    expect(screen.getByRole('alert')).toHaveTextContent(/no tienes permiso/i);
  });

  it('sends a visitor to sign in', () => {
    renderAt('/admin', null);
    expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('lets the administrator in', async () => {
    renderAt('/admin', 'ADMIN');
    expect(await screen.findByRole('heading', { name: 'Administración' })).toBeInTheDocument();
  });
});

