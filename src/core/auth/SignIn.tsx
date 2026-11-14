import { useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { gatewayUrl } from '../config';
import { ApiError } from '../http/apiError';
import { createApiClient, type ApiClient } from '../http/apiClient';
import { SessionError } from './session';
import { useSessionStore } from './SessionProvider';

type Mode = 'login' | 'register';

interface AuthAnswer {
  readonly accessToken: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What is wrong with the form before it is sent, field by field; an empty object means it can go. */
function validate(mode: Mode, values: { fullName: string; email: string; password: string }): Record<string, string> {
  const problems: Record<string, string> = {};
  if (mode === 'register' && values.fullName.trim().length < 2) problems['fullName'] = 'Escribe tu nombre (mínimo 2 letras).';
  if (!EMAIL.test(values.email.trim())) problems['email'] = 'Escribe un correo válido, por ejemplo ana@correo.com.';
  if (mode === 'register' ? values.password.length < 8 : values.password === '') {
    problems['password'] = mode === 'register' ? 'La contraseña debe tener al menos 8 caracteres.' : 'Escribe tu contraseña.';
  }
  return problems;
}

/** The text of a failure. The identity service answers 400 for a wrong password and for a taken email alike. */
function messageFor(mode: Mode, cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 400) {
      return mode === 'login'
        ? 'Correo o contraseña incorrectos.'
        : 'No pudimos crear la cuenta. Si ya tienes una con este correo, inicia sesión.';
    }
    return cause.userMessage;
  }
  return 'No pudimos iniciar tu sesión. Inténtalo de nuevo.';
}

/**
 * The way in. A person signs in with their email and password, or creates an account: self-service accounts are always
 * CUSTOMER (the identity service decides that, never this form). The token that comes back is handed to the session
 * store, which is the only place that keeps it. Staff accounts are created by the administration, not here.
 */
export function SignIn({ client }: { client?: ApiClient }) {
  const store = useSessionStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>('login');
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // This client carries no token: signing in is what makes one. A 401 here means nothing to end.
  const api = useMemo(
    () => client ?? createApiClient({ baseUrl: gatewayUrl, getToken: () => null, onUnauthorized: () => undefined }),
    [client],
  );

  const from = (location.state as { from?: { pathname: string; search?: string } } | null)?.from;

  function switchTo(next: Mode) {
    setMode(next);
    setProblems({});
    setFailure(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = {
      fullName: String(data.get('fullName') ?? ''),
      email: String(data.get('email') ?? ''),
      password: String(data.get('password') ?? ''),
    };
    const found = validate(mode, values);
    setProblems(found);
    setFailure(null);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      const body =
        mode === 'login'
          ? { email: values.email.trim(), password: values.password }
          : { fullName: values.fullName.trim(), email: values.email.trim(), password: values.password };
      const answer = await api.post<AuthAnswer>(mode === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register', body);
      store.signIn(answer.data.accessToken);
      const role = store.getSession()?.role;
      void navigate(from ? `${from.pathname}${from.search ?? ''}` : role === 'ADMIN' ? '/catalog/admin' : '/catalog', { replace: true });
    } catch (cause) {
      if (cause instanceof SessionError) setFailure('No pudimos iniciar tu sesión. Inténtalo de nuevo.');
      else setFailure(messageFor(mode, cause));
    } finally {
      setBusy(false);
    }
  }

  const registering = mode === 'register';

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="auth-switch" role="group" aria-label="Elige qué quieres hacer">
        <button type="button" aria-pressed={!registering} onClick={() => switchTo('login')}>
          Ya tengo cuenta
        </button>
        <button type="button" aria-pressed={registering} onClick={() => switchTo('register')}>
          Soy nuevo
        </button>
      </div>
      <h2 id="auth-title">{registering ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
      <p className="field-hint">{registering ? 'Tu cuenta será de cliente: podrás comprar y ver tus pedidos.' : 'Entra para comprar y ver tus pedidos.'}</p>
      {failure && <p role="alert">{failure}</p>}
      <form onSubmit={(event) => void submit(event)} noValidate>
        {registering && (
          <div className="field">
            <label htmlFor="fullName">Nombre completo</label>
            <input id="fullName" name="fullName" autoComplete="name" aria-invalid={problems['fullName'] !== undefined} aria-describedby={problems['fullName'] ? 'fullName-error' : undefined} />
            {problems['fullName'] && (
              <p id="fullName-error" className="field-error">
                {problems['fullName']}
              </p>
            )}
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Correo</label>
          <input id="email" name="email" type="email" autoComplete="email" aria-invalid={problems['email'] !== undefined} aria-describedby={problems['email'] ? 'email-error' : undefined} />
          {problems['email'] && (
            <p id="email-error" className="field-error">
              {problems['email']}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={registering ? 'new-password' : 'current-password'}
            aria-invalid={problems['password'] !== undefined}
            aria-describedby={problems['password'] ? 'password-error' : undefined}
          />
          {problems['password'] && (
            <p id="password-error" className="field-error">
              {problems['password']}
            </p>
          )}
        </div>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Un momento…' : registering ? 'Crear mi cuenta' : 'Entrar'}
        </button>
      </form>
    </section>
  );
}
