import type { RemoteDefinition } from './types';

/**
 * Which portals exist and where they are mounted (Annex H). Adding a domain is one entry here, its remote in
 * vite.config.ts and its declaration in remotes.d.ts. Both portals are public: a visitor can browse the catalog and buy;
 * what needs a person (my orders, the admin) is asked of the service, which answers 401 or 403.
 */
export const remotes: readonly RemoteDefinition[] = [
  { id: 'catalog', label: 'Catálogo', path: '/catalog', requiresSession: false, load: () => import('catalogPortal/App') },
  { id: 'sales', label: 'Ventas', path: '/sales', requiresSession: false, load: () => import('salesPortal/App') },
];
