import { describe, expect, it } from 'vitest';
import * as auth from './exposed';
import * as cart from '../cart/exposed';

/**
 * What a portal can reach is the SURFACE of the shell, and a surface that grows by accident is how a token leaks. These fail the
 * build when a name is added to what the shell lends, so adding one is a decision somebody makes on purpose.
 */
describe('what the shell lends to the portals', () => {
  it('shell/auth lends who is signed in and two guards, and nothing that holds the token or can sign in or out', () => {
    expect(Object.keys(auth).sort()).toEqual(['RequireAuth', 'RequireRole', 'useSessionInfo']);
  });

  it('shell/cart lends the cart and its limit, and nothing else', () => {
    expect(Object.keys(cart).sort()).toEqual(['MAX_QUANTITY', 'useCart']);
  });
});
