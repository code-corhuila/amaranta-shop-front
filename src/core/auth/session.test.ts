import { describe, expect, it, vi } from 'vitest';
import { createSessionStore, SessionError } from './session';
import { fakeToken, NOW_SECONDS, validToken } from './testTokens';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    data,
  };
}

const now = () => NOW_SECONDS * 1000;

describe('a session', () => {
  it('starts empty: a visitor has none and can still browse and buy', () => {
    const store = createSessionStore({ storage: memoryStorage(), now });
    expect(store.getSession()).toBeNull();
    expect(store.getToken()).toBeNull();
  });

  it('reads the claims the security service puts in a token: sub, role and exp', () => {
    const store = createSessionStore({ storage: memoryStorage(), now });
    const token = validToken({ sub: 'u-42', role: 'ADMIN' });
    store.signIn(token);
    expect(store.getToken()).toBe(token);
    expect(store.getSession()).toEqual({ token, subject: 'u-42', role: 'ADMIN', expiresAt: (NOW_SECONDS + 900) * 1000 });
  });

  it('refuses what is not a token, without keeping anything', () => {
    const storage = memoryStorage();
    const store = createSessionStore({ storage, now });
    for (const garbage of ['', 'not-a-token', 'a.b', 'a.b.c', `x.${btoa('[1,2]')}.y`]) {
      expect(() => store.signIn(garbage)).toThrow(SessionError);
    }
    expect(store.getSession()).toBeNull();
    expect(storage.data.size).toBe(0);
  });

  it('refuses a token that has already expired, and one with no expiry', () => {
    const store = createSessionStore({ storage: memoryStorage(), now });
    expect(() => store.signIn(validToken({ exp: NOW_SECONDS - 1 }))).toThrow(expect.objectContaining({ code: 'EXPIRED' }));
    expect(() => store.signIn(fakeToken({ sub: 'u', role: 'ADMIN' }))).toThrow(expect.objectContaining({ code: 'MALFORMED' }));
  });

  it('ends: nothing is left to send or to restore', () => {
    const storage = memoryStorage();
    const store = createSessionStore({ storage, now });
    store.signIn(validToken());
    store.signOut();
    expect(store.getToken()).toBeNull();
    expect(storage.data.size).toBe(0);
  });

  it('stops being a session when the token expires, without anyone calling signOut', () => {
    let clock = NOW_SECONDS * 1000;
    const store = createSessionStore({ storage: memoryStorage(), now: () => clock });
    store.signIn(validToken());
    expect(store.getToken()).not.toBeNull();
    clock = (NOW_SECONDS + 901) * 1000;
    expect(store.getToken()).toBeNull();
    expect(store.getSession()).toBeNull();
  });

  it('survives a reload of the page, and ignores what was stored if it is damaged or old', () => {
    const storage = memoryStorage();
    createSessionStore({ storage, now }).signIn(validToken({ sub: 'u-7' }));
    expect(createSessionStore({ storage, now }).getSession()?.subject).toBe('u-7');

    expect(createSessionStore({ storage: memoryStorage({ 'amaranta.session': 'garbage' }), now }).getSession()).toBeNull();
    const old = memoryStorage({ 'amaranta.session': validToken({ exp: NOW_SECONDS - 5 }) });
    expect(createSessionStore({ storage: old, now }).getSession()).toBeNull();
    expect(old.data.size).toBe(0);
  });

  it('works when the browser gives no storage at all', () => {
    const store = createSessionStore({ storage: null, now });
    store.signIn(validToken());
    expect(store.getToken()).not.toBeNull();
  });

  it('tells the screens that listen, on sign in and on sign out, until they stop listening', () => {
    const store = createSessionStore({ storage: memoryStorage(), now });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.signIn(validToken());
    store.signOut();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    store.signIn(validToken());
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('gives the same object until something changes, so a screen does not redraw for nothing', () => {
    const store = createSessionStore({ storage: memoryStorage(), now });
    store.signIn(validToken());
    expect(store.getSession()).toBe(store.getSession());
  });
});
