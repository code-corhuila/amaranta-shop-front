/**
 * The session lives in the shell and only here (Annex H). A portal never reads or keeps a token: it asks the shell's
 * client, which attaches this one.
 *
 * The shell READS the token to know who is signed in and when it expires, so it can show the right screens. It never
 * VERIFIES it: the signature, the revocation and the role are checked by every service, which cannot assume that anyone
 * else did (norm 5.3.7). A person who edits the token in their browser only fools their own screen.
 */
export interface Session {
  readonly token: string;
  readonly subject: string | null;
  readonly role: string | null;
  /** Milliseconds since the epoch. */
  readonly expiresAt: number;
}

export type SessionErrorCode = 'MALFORMED' | 'EXPIRED';

export class SessionError extends Error {
  readonly code: SessionErrorCode;

  constructor(code: SessionErrorCode, message: string) {
    super(message);
    this.name = 'SessionError';
    this.code = code;
  }
}

export interface SessionStore {
  getSession(): Session | null;
  getToken(): string | null;
  /** Throws a SessionError, and keeps nothing, when the token cannot be read or has expired. */
  signIn(token: string): void;
  signOut(): void;
  subscribe(listener: () => void): () => void;
}

type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface SessionStoreOptions {
  /** `null` for a browser that gives none; the session then lives until the page is closed. */
  readonly storage?: SessionStorage | null;
  readonly now?: () => number;
}

const STORAGE_KEY = 'amaranta.session';

function decodeSegment(segment: string): unknown {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

function readToken(token: string, now: number): Session {
  const malformed = () => new SessionError('MALFORMED', 'the token cannot be read');
  const segments = token.split('.');
  if (segments.length !== 3 || segments.some((s) => s === '')) throw malformed();

  let claims: unknown;
  try {
    claims = decodeSegment(segments[1] as string);
  } catch {
    throw malformed();
  }
  if (typeof claims !== 'object' || claims === null || Array.isArray(claims)) throw malformed();

  const { sub, role, exp } = claims as Record<string, unknown>;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) throw malformed();

  const expiresAt = exp * 1000;
  if (expiresAt <= now) throw new SessionError('EXPIRED', 'the token has expired');
  return { token, subject: typeof sub === 'string' ? sub : null, role: typeof role === 'string' ? role : null, expiresAt };
}

export function createSessionStore(options: SessionStoreOptions = {}): SessionStore {
  const storage = options.storage === undefined ? browserStorage() : options.storage;
  const now = options.now ?? (() => Date.now());
  const listeners = new Set<() => void>();

  function remember(token: string | null): void {
    try {
      if (token === null) storage?.removeItem(STORAGE_KEY);
      else storage?.setItem(STORAGE_KEY, token);
    } catch {
      // Storage can be full or blocked: the session still works until the page is closed.
    }
  }

  function restore(): Session | null {
    let stored: string | null = null;
    try {
      stored = storage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
    if (stored === null) return null;
    try {
      return readToken(stored, now());
    } catch {
      remember(null);
      return null;
    }
  }

  let current: Session | null = restore();
  const notify = () => listeners.forEach((listener) => listener());

  return {
    // The same object until something changes, so a screen that listens does not redraw for nothing.
    getSession: () => (current !== null && current.expiresAt > now() ? current : null),
    getToken() {
      return this.getSession()?.token ?? null;
    },
    signIn(token) {
      current = readToken(token, now());
      remember(token);
      notify();
    },
    signOut() {
      current = null;
      remember(null);
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

function browserStorage(): SessionStorage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}
