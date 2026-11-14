import { Link, NavLink, Outlet } from 'react-router-dom';
import { useSession, useSessionStore } from '../core/auth/SessionProvider';
import { useCart } from '../core/cart/useCart';
import type { RemoteDefinition } from '../remotes/types';

/** The cart drawn as a line icon: it is decoration, the link carries its name in `aria-label`. */
function CartIcon() {
  return (
    <svg className="cart-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M2.5 3h2.6l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L20.5 7H6.2" />
    </svg>
  );
}

/** What every screen shares: the name, the navigation, who is signed in, the cart, and the place where a portal is drawn. */
export function Shell({ remotes }: { remotes: readonly RemoteDefinition[] }) {
  const session = useSession();
  const store = useSessionStore();
  const { count } = useCart();
  // The cart is taken to the sales portal, wherever the registry mounts it.
  const sales = remotes.find((remote) => remote.id === 'sales');

  return (
    <>
      <header className="app-header">
        {/* The name is the way home: there is no separate "Inicio" link. */}
        <h1 className="app-brand">
          <Link to="/">Amaranta Shop</Link>
        </h1>
        <nav aria-label="Principal" className="app-nav">
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
      {sales && (
        // A round button that floats at the right edge of the screen, on every page. data-cart-target: where a product flies
        // to when it is added (the catalog portal looks for this attribute).
        <Link to={`${sales.path}/cart`} className="cart-link" data-cart-target aria-label={count === 0 ? 'Carrito' : `Carrito, ${count} ${count === 1 ? 'producto' : 'productos'}`}>
          <CartIcon />
          {/* The key makes the badge a new element each time the count changes, so its animation plays again. */}
          {count > 0 && (
            <span key={count} className="cart-count">
              {count}
            </span>
          )}
        </Link>
      )}
    </>
  );
}
