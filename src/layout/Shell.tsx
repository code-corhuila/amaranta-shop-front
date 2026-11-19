import { Link, NavLink, Outlet } from 'react-router-dom';
import { roleLabel } from '../core/auth/roles';
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

/** A person's silhouette for the sign-in button: decoration, the button carries its name in its text. */
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

interface NavItem {
  readonly to: string;
  readonly label: string;
}

/**
 * What each person is offered, by who they are. A visitor browses (and buys from the cart that floats on every page); a customer
 * also has their orders; the administrator runs the shop, so that is what they are offered, and not the cart of a customer.
 * The services check the role again on every request: this only spares a person the doors that are not theirs.
 */
function navFor(remotes: readonly RemoteDefinition[], role: string | null): NavItem[] {
  const items: NavItem[] = [];
  for (const remote of remotes) {
    if (remote.id !== 'sales') {
      items.push({ to: remote.path, label: remote.label });
    } else if (role !== null && role !== 'ADMIN') {
      items.push({ to: remote.path, label: role === 'CUSTOMER' ? 'Mis pedidos' : remote.label });
    }
  }
  if (role === 'ADMIN') items.push({ to: '/admin', label: 'Administración' });
  return items;
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
          {navFor(remotes, session?.role ?? null).map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="app-session">
          {session ? (
            <>
              <span className="role-badge">{roleLabel(session.role)}</span>
              <button type="button" className="btn-pill btn-pill-quiet" onClick={() => store.signOut()}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <Link to="/sign-in" className="btn-pill btn-pill-primary">
              <UserIcon />
              Iniciar sesión
            </Link>
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
