import { Link, NavLink, Outlet } from 'react-router-dom';
import { useSession, useSessionStore } from '../core/auth/SessionProvider';
import { useCart } from '../core/cart/useCart';
import type { RemoteDefinition } from '../remotes/types';

/** What every screen shares: the name, the navigation, who is signed in, and the place where a portal is drawn. */
export function Shell({ remotes }: { remotes: readonly RemoteDefinition[] }) {
  const session = useSession();
  const store = useSessionStore();
  const { count } = useCart();
  // The cart is taken to the sales portal, wherever the registry mounts it.
  const sales = remotes.find((remote) => remote.id === 'sales');

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
          {sales && (
            <Link to={`${sales.path}/cart`} className="cart-link" aria-label={count === 0 ? 'Carrito' : `Carrito, ${count} ${count === 1 ? 'producto' : 'productos'}`}>
              Carrito
              {count > 0 && <span className="cart-count">{count}</span>}
            </Link>
          )}
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
