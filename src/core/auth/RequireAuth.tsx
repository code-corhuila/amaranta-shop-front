import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from './SessionProvider';

/**
 * Wraps a route that needs a person. Without a session it goes to the sign-in and remembers where the person was going,
 * so signing in brings them back there. The gateway and the service refuse the request anyway; this only spares the person
 * a screen that would fail.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession();
  const location = useLocation();
  if (session === null) return <Navigate to="/sign-in" replace state={{ from: location }} />;
  return children;
}
