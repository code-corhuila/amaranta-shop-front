import { createContext, useContext, type ReactNode } from 'react';
import type { CartStore } from './cart';

const CartContext = createContext<CartStore | null>(null);

export function CartProvider({ store, children }: { store: CartStore; children: ReactNode }) {
  return <CartContext.Provider value={store}>{children}</CartContext.Provider>;
}

export function useCartStore(): CartStore {
  const store = useContext(CartContext);
  if (store === null) throw new Error('useCart needs a <CartProvider> above it');
  return store;
}
