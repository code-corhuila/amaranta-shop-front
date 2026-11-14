import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { Session, SessionStore } from './session';

const SessionContext = createContext<SessionStore | null>(null);

export function SessionProvider({ store, children }: { store: SessionStore; children: ReactNode }) {
  return <SessionContext.Provider value={store}>{children}</SessionContext.Provider>;
}

export function useSessionStore(): SessionStore {
  const store = useContext(SessionContext);
  if (store === null) throw new Error('useSession needs a <SessionProvider> above it');
  return store;
}

/** The session, or null for a visitor. The screen redraws when it starts or ends. */
export function useSession(): Session | null {
  const store = useSessionStore();
  return useSyncExternalStore(store.subscribe, store.getSession);
}
