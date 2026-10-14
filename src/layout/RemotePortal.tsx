import { lazy, Suspense, useMemo, useState } from 'react';
import { RemoteBoundary } from '../core/errors/RemoteBoundary';
import type { RemoteDefinition } from '../remotes/types';

/**
 * Mounts one portal inside its own boundary. `lazy` remembers a failed load for good, so asking again builds a new one.
 */
export function RemotePortal({ remote }: { remote: RemoteDefinition }) {
  const [attempt, setAttempt] = useState(0);
  // `attempt` is in the list on purpose: it is what makes a retry build a new lazy component.
  const Portal = useMemo(() => lazy(remote.load), [remote, attempt]);

  return (
    <RemoteBoundary name={remote.label} onRetry={() => setAttempt((n) => n + 1)}>
      <Suspense fallback={<p role="status">Cargando {remote.label}…</p>}>
        <Portal />
      </Suspense>
    </RemoteBoundary>
  );
}
