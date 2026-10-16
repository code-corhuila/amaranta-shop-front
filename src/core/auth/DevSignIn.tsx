import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SessionError } from './session';
import { useSessionStore } from './SessionProvider';

/**
 * DEVELOPMENT ONLY (Annex H, rule 5). It lets a developer paste a token they got from the security service. It is
 * replaced by the sign-in portal of the identity domain before anything reaches `main`: in a production build there is
 * no way in through here, which is why the form exists only while `import.meta.env.DEV` is true.
 */
export function DevSignIn() {
  const store = useSessionStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  if (!import.meta.env.DEV) {
    return (
      <main>
        <h1>Iniciar sesión</h1>
        <p>El inicio de sesión de este entorno aún no está disponible.</p>
      </main>
    );
  }

  const from = (location.state as { from?: { pathname: string; search?: string } } | null)?.from;
  const destination = from ? `${from.pathname}${from.search ?? ''}` : '/';

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = String(new FormData(event.currentTarget).get('token') ?? '').trim();
    try {
      store.signIn(token);
      void navigate(destination, { replace: true });
    } catch (cause) {
      if (!(cause instanceof SessionError)) throw cause;
      setError(cause.code === 'EXPIRED' ? 'El token ya venció.' : 'Esto no es un token válido.');
    }
  }

  return (
    <main>
      <h1>Iniciar sesión</h1>
      <p>Entorno de desarrollo: pega un token emitido por el servicio de seguridad.</p>
      <form onSubmit={submit} noValidate>
        <label htmlFor="token">Token de desarrollo</label>
        <textarea id="token" name="token" rows={4} aria-invalid={error !== null} aria-describedby={error ? 'token-error' : undefined} />
        {error && (
          <p id="token-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit">Entrar</button>
      </form>
    </main>
  );
}
