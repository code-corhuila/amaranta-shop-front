/**
 * The cart lives in the shell, because two portals use it: the catalog adds to it and sales buys from it (Annex H puts what
 * more than one portal needs in the shell, as it does with the session). It holds what a person CHOSE, and nothing the service
 * decides: the total of an order is the service's, computed from the products it reserves (RN-01).
 *
 * Prices are whole pesos, so every sum is of integers and exact: a float never gets into the cart (Annex H).
 */

/** What the service accepts for a line (RN-04). */
export const MAX_QUANTITY = 50;

/** A product as the catalog showed it when it was added: the name and the price the person saw. */
export interface CartProduct {
  readonly productId: string;
  readonly name: string;
  /** Whole pesos. */
  readonly price: number;
  /** As the service formatted it, e.g. "$ 189.000". */
  readonly priceFormatted: string;
  readonly imageUrl: string | null;
}

export interface CartItem extends CartProduct {
  readonly quantity: number;
}

export interface CartStore {
  /** The same list until something changes, and frozen. */
  getItems(): readonly CartItem[];
  /** Units, not lines. */
  getCount(): number;
  /** Adds to the line of that product, never to a second one. `capped` says the line stopped at 50. */
  add(product: CartProduct, quantity?: number): { readonly capped: boolean };
  /** A whole number from 1 to 50; anything else is ignored. */
  setQuantity(productId: string, quantity: number): void;
  remove(productId: string): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
}

type CartStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface CartStoreOptions {
  /** `null` for a browser that gives none; the cart then lives until the page is closed. */
  readonly storage?: CartStorage | null;
}

const STORAGE_KEY = 'amaranta.cart';

const isWholePesos = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;

function clamp(quantity: number): number {
  return Math.min(Math.max(quantity, 1), MAX_QUANTITY);
}

function asItem(value: unknown): CartItem | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const { productId, name, price, priceFormatted, imageUrl, quantity } = v;
  if (typeof productId !== 'string' || productId === '' || typeof name !== 'string' || typeof priceFormatted !== 'string') return null;
  if (!isWholePesos(price) || typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1) return null;
  return Object.freeze({ productId, name, price, priceFormatted, imageUrl: typeof imageUrl === 'string' ? imageUrl : null, quantity: clamp(quantity) });
}

/** What was kept, if it is still a cart: damaged, edited or old data is dropped line by line, never trusted. */
function restore(storage: CartStorage | null): CartItem[] {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return [];
  }
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed.flatMap((entry: unknown) => {
      const item = asItem(entry);
      if (item === null || seen.has(item.productId)) return [];
      seen.add(item.productId);
      return [item];
    });
  } catch {
    return [];
  }
}

export function createCartStore(options: CartStoreOptions = {}): CartStore {
  const storage = options.storage === undefined ? browserStorage() : options.storage;
  const listeners = new Set<() => void>();
  let items: readonly CartItem[] = Object.freeze(restore(storage));
  let count = items.reduce((sum, item) => sum + item.quantity, 0);

  function commit(next: readonly CartItem[]): void {
    items = Object.freeze([...next]);
    count = items.reduce((sum, item) => sum + item.quantity, 0);
    try {
      if (items.length === 0) storage?.removeItem(STORAGE_KEY);
      else storage?.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage can be full or blocked: the cart still works until the page is closed.
    }
    listeners.forEach((listener) => listener());
  }

  return {
    getItems: () => items,
    getCount: () => count,
    add(product, quantity = 1) {
      if (!isWholePesos(product.price) || !Number.isSafeInteger(quantity) || quantity < 1) return { capped: false };
      const existing = items.find((item) => item.productId === product.productId);
      const wanted = (existing?.quantity ?? 0) + quantity;
      const next = clamp(wanted);
      if (existing?.quantity === next) return { capped: wanted > MAX_QUANTITY };
      const line = Object.freeze({ ...product, quantity: next });
      commit(existing ? items.map((item) => (item === existing ? line : item)) : [...items, line]);
      return { capped: wanted > MAX_QUANTITY };
    },
    setQuantity(productId, quantity) {
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) return;
      const existing = items.find((item) => item.productId === productId);
      if (!existing || existing.quantity === quantity) return;
      commit(items.map((item) => (item === existing ? Object.freeze({ ...item, quantity }) : item)));
    },
    remove(productId) {
      if (!items.some((item) => item.productId === productId)) return;
      commit(items.filter((item) => item.productId !== productId));
    },
    clear() {
      if (items.length === 0) return;
      commit([]);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

function browserStorage(): CartStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
