import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { createCartStore, type CartProduct } from './cart';
import { CartProvider } from './CartProvider';
import { useCart } from './useCart';

const croquetas: CartProduct = { productId: 'p-1', name: 'Croquetas Adulto', price: 189_000, priceFormatted: '$ 189.000', imageUrl: null };

function setup() {
  const store = createCartStore({ storage: null });
  const wrapper = ({ children }: { children: ReactNode }) => <CartProvider store={store}>{children}</CartProvider>;
  return { store, wrapper };
}

describe('useCart, lent to the portals as shell/cart', () => {
  it('gives the items and their count, and follows the cart', () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toEqual([]);
    expect(result.current.count).toBe(0);

    act(() => void result.current.add(croquetas, 2));
    expect(result.current.items).toEqual([{ ...croquetas, quantity: 2 }]);
    expect(result.current.count).toBe(2);
  });

  it('changes a quantity, removes a line and empties the cart', () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => void result.current.add(croquetas));
    act(() => result.current.setQuantity('p-1', 5));
    expect(result.current.count).toBe(5);
    act(() => result.current.remove('p-1'));
    expect(result.current.items).toEqual([]);
    act(() => void result.current.add(croquetas));
    act(() => result.current.clear());
    expect(result.current.count).toBe(0);
  });

  it('says when a line stopped at the limit the service accepts', () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useCart(), { wrapper });
    let outcome = { capped: false };
    act(() => void (outcome = result.current.add(croquetas, 60)));
    expect(outcome).toEqual({ capped: true });
    expect(result.current.count).toBe(50);
  });

  it('is the same cart for every screen under the provider', () => {
    const { store, wrapper } = setup();
    const first = renderHook(() => useCart(), { wrapper });
    const second = renderHook(() => useCart(), { wrapper });
    act(() => void store.add(croquetas, 3));
    expect(first.result.current.count).toBe(3);
    expect(second.result.current.count).toBe(3);
  });

  it('needs a provider above it, instead of an empty cart that forgets everything', () => {
    expect(() => renderHook(() => useCart())).toThrow(/CartProvider/);
  });
});
