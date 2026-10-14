import { createCartStore } from './cart';

/** The one cart of the shell. The screens read it through the provider; the portals read it through shell/cart. */
export const cartStore = createCartStore();
