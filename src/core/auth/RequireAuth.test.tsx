import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DevSignIn } from './DevSignIn';
import { RequireAuth } from './RequireAuth';
import { createSessionStore } from './session';
import { SessionProvider } from './SessionProvider';
import { NOW_SECONDS, validToken } from './testTokens';

function renderAt(path: string) {
  const session = createSessionStore({ storage: null, now: () => NOW_SECONDS * 1000 });
  render(
    <SessionProvider store={session}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/sign-in" element={<DevSignIn />} />
          <Route path="/" element={<p>Inicio público</p>} />
          <Route
            path="/orders"
            element={
              <RequireAuth>
                <p>Mis pedidos</p>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  );
  return session;
}

describe('RequireAuth', () => {
  it('lets a public route be seen with no session', () => {
    renderAt('/');
    expect(screen.getByText('Inicio público')).toBeInTheDocument();
  });

  it('takes a protected route to the sign-in when there is no session', () => {
    renderAt('/orders');
    expect(screen.queryByText('Mis pedidos')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('...and brings the person back to the route they asked for after signing in', async () => {
    renderAt('/orders');
    await userEvent.click(screen.getByLabelText(/token de desarrollo/i));
    await userEvent.paste(validToken());
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByText('Mis pedidos')).toBeInTheDocument();
  });

  it('shows the protected route at once when there is a session', () => {
    const session = createSessionStore({ storage: null, now: () => NOW_SECONDS * 1000 });
    session.signIn(validToken());
    render(
      <SessionProvider store={session}>
        <MemoryRouter initialEntries={['/orders']}>
          <Routes>
            <Route
              path="/orders"
              element={
                <RequireAuth>
                  <p>Mis pedidos</p>
                </RequireAuth>
              }
            />
          </Routes>
        </MemoryRouter>
      </SessionProvider>,
    );
    expect(screen.getByText('Mis pedidos')).toBeInTheDocument();
  });

  it('sends the person back to the sign-in the moment the session ends', async () => {
    const session = renderAt('/orders');
    await userEvent.click(screen.getByLabelText(/token de desarrollo/i));
    await userEvent.paste(validToken());
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByText('Mis pedidos')).toBeInTheDocument();
    await act(async () => session.signOut());
    expect(await screen.findByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
  });
});

describe('DevSignIn', () => {
  it('says what is wrong with a token that is not one, next to the field, and does not sign in', async () => {
    renderAt('/sign-in');
    await userEvent.click(screen.getByLabelText(/token de desarrollo/i));
    await userEvent.paste('esto no es un token');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    const field = screen.getByLabelText(/token de desarrollo/i);
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription(/no es un token válido/i);
  });

  it('says that a token that already expired is expired', async () => {
    renderAt('/sign-in');
    await userEvent.click(screen.getByLabelText(/token de desarrollo/i));
    await userEvent.paste(validToken({ exp: NOW_SECONDS - 10 }));
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(screen.getByLabelText(/token de desarrollo/i)).toHaveAccessibleDescription(/ya venció/i);
  });
});
