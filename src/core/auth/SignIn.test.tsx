import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../http/apiError';
import type { ApiClient } from '../http/apiClient';
import { createSessionStore } from './session';
import { SessionProvider } from './SessionProvider';
import { SignIn } from './SignIn';
import { NOW_SECONDS, validToken } from './testTokens';

function clientThatAnswers(post: ApiClient['post']): ApiClient {
  const refuse = () => Promise.reject(new Error('not used'));
  return { get: refuse, post, put: refuse, patch: refuse, delete: refuse };
}

function renderSignIn(client: ApiClient, path = '/sign-in') {
  const session = createSessionStore({ storage: null, now: () => NOW_SECONDS * 1000 });
  render(
    <SessionProvider store={session}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/sign-in" element={<SignIn client={client} />} />
          <Route path="/catalog" element={<p>Catálogo abierto</p>} />
          <Route path="/catalog/admin" element={<p>Administración abierta</p>} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  );
  return session;
}

const answer = (role: string) => ({ status: 200, location: null, data: { accessToken: validToken({ role }) } });

async function fill(label: RegExp, text: string) {
  await userEvent.type(screen.getByLabelText(label), text);
}

describe('SignIn', () => {
  it('signs a person in with their email and password and takes them to the catalog', async () => {
    const post = vi.fn().mockResolvedValue(answer('CUSTOMER'));
    const session = renderSignIn(clientThatAnswers(post));
    await fill(/correo/i, 'ana@correo.com');
    await fill(/contraseña/i, 'clave-segura-1');
    await userEvent.click(screen.getByRole('button', { name: /^entrar$/i }));
    expect(await screen.findByText('Catálogo abierto')).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/api/v1/auth/login', { email: 'ana@correo.com', password: 'clave-segura-1' });
    expect(session.getSession()?.role).toBe('CUSTOMER');
  });

  it('takes an administrator to the administration', async () => {
    renderSignIn(clientThatAnswers(vi.fn().mockResolvedValue(answer('ADMIN'))));
    await fill(/correo/i, 'admin@correo.com');
    await fill(/contraseña/i, 'clave-segura-1');
    await userEvent.click(screen.getByRole('button', { name: /^entrar$/i }));
    expect(await screen.findByText('Administración abierta')).toBeInTheDocument();
  });

  it('creates an account that asks for a name, an email and a password, and never for a role', async () => {
    const post = vi.fn().mockResolvedValue(answer('CUSTOMER'));
    const session = renderSignIn(clientThatAnswers(post));
    await userEvent.click(screen.getByRole('button', { name: /soy nuevo/i }));
    expect(screen.getByRole('heading', { name: /crear cuenta/i })).toBeInTheDocument();
    await fill(/nombre completo/i, 'Ana Torres');
    await fill(/correo/i, 'ana@correo.com');
    await fill(/contraseña/i, 'clave-segura-1');
    await userEvent.click(screen.getByRole('button', { name: /crear mi cuenta/i }));
    expect(await screen.findByText('Catálogo abierto')).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/api/v1/auth/register', { fullName: 'Ana Torres', email: 'ana@correo.com', password: 'clave-segura-1' });
    expect(session.getSession()?.role).toBe('CUSTOMER');
  });

  it('says what is wrong next to each field and sends nothing while the form is invalid', async () => {
    const post = vi.fn();
    renderSignIn(clientThatAnswers(post));
    await userEvent.click(screen.getByRole('button', { name: /soy nuevo/i }));
    await fill(/correo/i, 'esto-no-es-un-correo');
    await fill(/contraseña/i, 'corta');
    await userEvent.click(screen.getByRole('button', { name: /crear mi cuenta/i }));
    expect(screen.getByLabelText(/nombre completo/i)).toHaveAccessibleDescription(/nombre/i);
    expect(screen.getByLabelText(/correo/i)).toHaveAccessibleDescription(/correo válido/i);
    expect(screen.getByLabelText(/contraseña/i)).toHaveAccessibleDescription(/8 caracteres/i);
    expect(post).not.toHaveBeenCalled();
  });

  it('tells a wrong password without saying which half was wrong, and keeps nobody signed in', async () => {
    const wrong = new ApiError({ status: 400, code: 'HTTP_400', message: 'Email or password is incorrect', traceId: 't' });
    const session = renderSignIn(clientThatAnswers(vi.fn().mockRejectedValue(wrong)));
    await fill(/correo/i, 'ana@correo.com');
    await fill(/contraseña/i, 'clave-equivocada');
    await userEvent.click(screen.getByRole('button', { name: /^entrar$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/correo o contraseña incorrectos/i);
    expect(session.getSession()).toBeNull();
  });

  it('says the service is down when the gateway cannot be reached', async () => {
    const down = new ApiError({ status: 0, code: 'NETWORK', message: 'failed to fetch', traceId: 't' });
    renderSignIn(clientThatAnswers(vi.fn().mockRejectedValue(down)));
    await fill(/correo/i, 'ana@correo.com');
    await fill(/contraseña/i, 'clave-segura-1');
    await userEvent.click(screen.getByRole('button', { name: /^entrar$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no hay conexión/i);
  });
});
