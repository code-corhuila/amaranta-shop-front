import { describe, expect, it, vi } from 'vitest';
import { createCartStore, MAX_QUANTITY, type CartItem } from './cart';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    data,
  };
}

const croquetas = { productId: 'p-1', name: 'Croquetas Adulto', price: 189_000, priceFormatted: '$ 189.000', imageUrl: null } as const;
const juguete = { productId: 'p-2', name: 'Juguete para gato', price: 8_500, priceFormatted: '$ 8.500', imageUrl: 'https://example.test/j.png' } as const;

describe('the cart', () => {
  it('starts empty', () => {
    const cart = createCartStore({ storage: memoryStorage() });
    expect(cart.getItems()).toEqual([]);
    expect(cart.getCount()).toBe(0);
  });

  it('adds a product with a quantity of one, keeping the name and the price it had when it was added', () => {
    const cart = createCartStore({ storage: memoryStorage() });
    cart.add(croquetas);
    expect(cart.getItems()).toEqual([{ ...croquetas, quantity: 1 }]);
  });

  it('adds the same product again to the same line, never to a second one', () => {
    const cart = createCartStore({ storage: memoryStorage() });
    cart.add(croquetas);
    cart.add(croquetas, 2);
    expect(cart.getItems()).toEqual([{ ...croquetas, quantity: 3 }]);
  });

  it('counts the units, not the lines', () => {
    const cart = createCartStore({ storage: memoryStorage() });
    cart.add(croquetas, 2);
    cart.add(juguete, 3);
    expect(cart.getCount()).toBe(5);
  });

  it('never goes past 50 in a line, which is what the service accepts, and says so', () => {
    const cart = createCartStore({ storage: memoryStorage() });
    expect(cart.add(croquetas, 49)).toEqual({ capped: false });
    expect(cart.add(croquetas, 5)).toEqual({ capped: true });
    expect(cart.getItems()[0]?.quantity).toBe(MAX_QUANTITY);
  });

  it('sets a quantity exactly, from 1 to 50, and ignores what is not a whole number in that range', () => {
    const cart = createCartStore({ storage: memoryStorage() });
    cart.add(croquetas);
    cart.setQuantity('p-1', 7);
    expect(cart.getItems()[0]?.quantity).toBe(7);
    for (const bad of [0.5, 2.5, -1, 51, Number.NaN, Number.POSITIVE_INFINITY]) cart.setQuantity('p-1', bad);
    expect(cart.getItems()[0]?.quantity).toBe(7);
  });

  it('ignores a quantity for a product that is not in the cart', () => {
    const cart = createCartStore({ storage: memoryStorage() });
    cart.setQuantity('nope', 3);
    expect(cart.getItems()).toEqual([]);
  });

  it('removes a line, and empties', () => {
    const cart = createCartStore({ storage: memoryStorage() });
    cart.add(croquetas);
    cart.add(juguete);
    cart.remove('p-1');
    expect(cart.getItems().map((i) => i.productId)).toEqual(['p-2']);
    cart.clear();
    expect(cart.getItems()).toEqual([]);
  });

  it('refuses an item whose price is not whole pesos, instead of keeping a float in the cart', () => {
    const cart = createCartStore({ storage: memoryStorage() });
    for (const price of [10.5, -1, 0, Number.NaN]) cart.add({ ...croquetas, price });
    expect(cart.getItems()).toEqual([]);
  });

  it('survives a reload of the page, and a cart that is damaged or edited by hand is cleaned instead of trusted', () => {
    const storage = memoryStorage();
    createCartStore({ storage }).add(croquetas, 4);
    expect(createCartStore({ storage }).getItems()).toEqual([{ ...croquetas, quantity: 4 }]);

    const damaged = memoryStorage({ 'amaranta.cart': 'not json' });
    expect(createCartStore({ storage: damaged }).getItems()).toEqual([]);

    const edited = memoryStorage({
      'amaranta.cart': JSON.stringify([
        { ...croquetas, quantity: 9999 },
        { ...juguete, quantity: 2 },
        { ...juguete, quantity: 1 },
        { productId: 7 },
        'junk',
        { ...croquetas, productId: 'p-3', price: 1.5, quantity: 1 },
      ]),
    });
    const cleaned = createCartStore({ storage: edited }).getItems();
    expect(cleaned.map((i) => [i.productId, i.quantity])).toEqual([
      ['p-1', 50],
      ['p-2', 2],
    ]);
  });

  it('works when the browser gives no storage at all', () => {
    const cart = createCartStore({ storage: null });
    cart.add(croquetas);
    expect(cart.getCount()).toBe(1);
  });

  it('keeps working when the storage is full or blocked', () => {
    const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => undefined };
    const cart = createCartStore({ storage });
    cart.add(croquetas);
    expect(cart.getCount()).toBe(1);
  });

  it('tells the screens that listen, until they stop listening', () => {
    const cart = createCartStore({ storage: memoryStorage() });
    const listener = vi.fn();
    const stop = cart.subscribe(listener);
    cart.add(croquetas);
    cart.setQuantity('p-1', 2);
    cart.remove('p-1');
    expect(listener).toHaveBeenCalledTimes(3);
    stop();
    cart.add(croquetas);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('gives the same list until something changes, so a screen does not redraw for nothing', () => {
    const cart = createCartStore({ storage: memoryStorage() });
    cart.add(croquetas);
    expect(cart.getItems()).toBe(cart.getItems());
  });

  it('does not tell anybody when nothing changed', () => {
    const cart = createCartStore({ storage: memoryStorage() });
    const listener = vi.fn();
    cart.subscribe(listener);
    cart.remove('nope');
    cart.setQuantity('nope', 2);
    cart.clear();
    expect(listener).not.toHaveBeenCalled();
  });

  it('is typed as items that nobody can edit from outside', () => {
    const cart = createCartStore({ storage: memoryStorage() });
    cart.add(croquetas);
    const items: readonly CartItem[] = cart.getItems();
    expect(Object.isFrozen(items)).toBe(true);
  });
});
