import type { ComponentType } from 'react';

/** A domain portal the shell can mount: what it is called, where it lives in the navigation, and how to load it. */
export interface RemoteDefinition {
  readonly id: string;
  /** What the navigation says. */
  readonly label: string;
  /** Where the shell mounts it, e.g. `/catalog`. The portal owns everything below. */
  readonly path: string;
  /** Whether the shell sends a visitor to the sign-in before showing it. */
  readonly requiresSession: boolean;
  /** Called when the person opens the route, never at start: a portal that is down must not stop the shell from starting. */
  readonly load: () => Promise<{ default: ComponentType }>;
}
