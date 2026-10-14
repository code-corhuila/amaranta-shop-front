import { Link, NavLink, Outlet } from 'react-router-dom';
import { useSession, useSessionStore } from '../core/auth/SessionProvider';
import type { RemoteDefinition } from '../remotes/types';

/** What every screen shares: the name, the navigation, who is signed in, and the place where a portal is drawn. */
export function Shell({ remotes }: { remotes: readonly RemoteDefinition[] }) {
  const session = useSession();
  const store = useSessionStore();

  return (
    <>
      <header className="app-header">
        <h1>Amaranta Shop</h1>
        <nav aria-label="Principal" className="app-nav">
          <NavLink to="/" end>
            Inicio
          </NavLink>
          {remotes.map((remote) => (
            <NavLink key={remote.id} to={remote.path}>
              {remote.label}
            </NavLink>
          ))}
        </nav>
        <div className="app-session">
          {session ? (
            <>
              <span>Rol: {session.role ?? 'sin rol'}</span>
              <button type="button" onClick={() => store.signOut()}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <Link to="/sign-in">Iniciar sesión</Link>
          )}
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </>
  );
}
