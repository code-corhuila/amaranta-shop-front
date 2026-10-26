import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { useSession } from './SessionProvider';

/**
 * Wraps a screen that only one role may use (the administration of a domain). A visitor goes to the sign-in and comes back
 * here; a person with another role is told so, instead of being shown a screen whose every request would fail with 403.
 * The services check the role again on every request: this only spares the person a screen that cannot work.
 */
export function RequireRole({ role, children }: { role: string; children: ReactNode }) {
  const session = useSession();
  if (session !== null && session.role !== role) {
    return (
      <div role="alert">
        <p>No tienes permiso para ver esta sección.</p>
        <Link to="/">Volver al inicio</Link>
      </div>
    );
  }
  return <RequireAuth>{children}</RequireAuth>;
}
