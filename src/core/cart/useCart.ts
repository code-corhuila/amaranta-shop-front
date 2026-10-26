import { useSyncExternalStore } from 'react';
import type { CartItem, CartStore } from './cart';
import { useCartStore } from './CartProvider';

export interface CartView {
  readonly items: readonly CartItem[];
  /** Units, not lines. */
  readonly count: number;
  readonly add: CartStore['add'];
  readonly setQuantity: CartStore['setQuantity'];
  readonly remove: CartStore['remove'];
  readonly clear: CartStore['clear'];
}

/** The cart, and the screen redraws when it changes. The same one for every portal: it belongs to the shell. */
export function useCart(): CartView {
  const store = useCartStore();
  const items = useSyncExternalStore(store.subscribe, store.getItems);
  const count = useSyncExternalStore(store.subscribe, store.getCount);
  return { items, count, add: store.add, setQuantity: store.setQuantity, remove: store.remove, clear: store.clear };
}
