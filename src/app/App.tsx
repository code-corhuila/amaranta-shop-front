import { Route, Routes } from 'react-router-dom';
import { AdminHome } from '../admin/AdminHome';
import { UsersPage } from '../admin/UsersPage';
import { RequireAuth } from '../core/auth/RequireAuth';
import { RequireRole } from '../core/auth/RequireRole';
import { SignIn } from '../core/auth/SignIn';
import { Home, NotFound } from '../layout/Pages';
import { RemotePortal } from '../layout/RemotePortal';
import { Shell } from '../layout/Shell';
import type { RemoteDefinition } from '../remotes/types';

/**
 * The routes of the shell. The portals arrive as a parameter: `main.tsx` gives it the real registry, a test gives it
 * doubles, and nothing here imports a portal at start.
 */
export function App({ remotes }: { remotes: readonly RemoteDefinition[] }) {
  return (
    <Routes>
      <Route element={<Shell remotes={remotes} />}>
        <Route index element={<Home remotes={remotes} />} />
        <Route path="sign-in" element={<SignIn />} />
        <Route
          path="admin"
          element={
            <RequireRole role="ADMIN">
              <AdminHome />
            </RequireRole>
          }
        />
        <Route
          path="admin/users"
          element={
            <RequireRole role="ADMIN">
              <UsersPage />
            </RequireRole>
          }
        />
        {remotes.map((remote) => {
          const portal = <RemotePortal key={remote.id} remote={remote} />;
          return <Route key={remote.id} path={`${remote.path}/*`} element={remote.requiresSession ? <RequireAuth>{portal}</RequireAuth> : portal} />;
        })}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
