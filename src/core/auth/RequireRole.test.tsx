import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DevSignIn } from './DevSignIn';
import { RequireRole } from './RequireRole';
import { createSessionStore } from './session';
import { SessionProvider } from './SessionProvider';
import { NOW_SECONDS, validToken } from './testTokens';
import { useSessionInfo } from './useSessionInfo';

function setup() {
  const session = createSessionStore({ storage: null, now: () => NOW_SECONDS * 1000 });
  const wrapper = ({ children }: { children: ReactNode }) => <SessionProvider store={session}>{children}</SessionProvider>;
  return { session, wrapper };
}

function renderAdminArea(path = '/admin') {
  const { session, wrapper: Wrapper } = setup();
  render(
    <Wrapper>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/sign-in" element={<DevSignIn />} />
          <Route
            path="/admin"
            element={
              <RequireRole role="ADMIN">
                <p>Zona de administración</p>
              </RequireRole>
            }
          />
        </Routes>
      </MemoryRouter>
    </Wrapper>,
  );
  return session;
}

describe('RequireRole, lent to the portals as shell/auth', () => {
  it('takes a visitor to the sign-in, and brings them back once they are an admin', async () => {
    renderAdminArea();
    expect(screen.queryByText('Zona de administración')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText(/token de desarrollo/i));
    await userEvent.paste(validToken({ role: 'ADMIN' }));
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByText('Zona de administración')).toBeInTheDocument();
  });

  it('tells a person with another role that they have no permission, instead of showing a screen that would fail', () => {
    const { session, wrapper: Wrapper } = setup();
    session.signIn(validToken({ role: 'CUSTOMER' }));
    render(
      <Wrapper>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <RequireRole role="ADMIN">
                  <p>Zona de administración</p>
                </RequireRole>
              }
            />
          </Routes>
        </MemoryRouter>
      </Wrapper>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/no tienes permiso/i);
    expect(screen.queryByText('Zona de administración')).not.toBeInTheDocument();
  });

  it('shows the area to the role it names', () => {
    const { session, wrapper: Wrapper } = setup();
    session.signIn(validToken({ role: 'ADMIN' }));
    render(
      <Wrapper>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <RequireRole role="ADMIN">
                  <p>Zona de administración</p>
                </RequireRole>
              }
            />
          </Routes>
        </MemoryRouter>
      </Wrapper>,
    );
    expect(screen.getByText('Zona de administración')).toBeInTheDocument();
  });
});

describe('useSessionInfo: what a portal may know about the session', () => {
  it('says who is signed in and with which role, and follows the session', () => {
    const { session, wrapper } = setup();
    const { result } = renderHook(() => useSessionInfo(), { wrapper });
    expect(result.current).toEqual({ signedIn: false, role: null, subject: null });

    act(() => session.signIn(validToken({ sub: 'u-9', role: 'ADMIN' })));
    expect(result.current).toEqual({ signedIn: true, role: 'ADMIN', subject: 'u-9' });

    act(() => session.signOut());
    expect(result.current.signedIn).toBe(false);
  });

  it('never hands over the token, which only the shell may hold', () => {
    const { session, wrapper } = setup();
    const token = validToken({ role: 'ADMIN' });
    session.signIn(token);
    const { result } = renderHook(() => useSessionInfo(), { wrapper });
    expect(Object.keys(result.current).sort()).toEqual(['role', 'signedIn', 'subject']);
    expect(JSON.stringify(result.current)).not.toContain(token);
  });
});
