import { Route, Routes } from 'react-router-dom';
import { DevSignIn } from '../core/auth/DevSignIn';
import { RequireAuth } from '../core/auth/RequireAuth';
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
        <Route index element={<Home />} />
        <Route path="sign-in" element={<DevSignIn />} />
        {remotes.map((remote) => {
          const portal = <RemotePortal key={remote.id} remote={remote} />;
          return <Route key={remote.id} path={`${remote.path}/*`} element={remote.requiresSession ? <RequireAuth>{portal}</RequireAuth> : portal} />;
        })}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
