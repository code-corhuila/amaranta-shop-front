/**
 * What the shell lends to every portal as `shell/cart` (Annex H): the cart that the catalog adds to and sales buys from. It holds
 * what a person chose and never decides a total: that is the service's (RN-01).
 */
export { useCart, type CartView } from './useCart';
export { MAX_QUANTITY, type CartItem, type CartProduct } from './cart';
