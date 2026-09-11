export type QuoteItem = { productId: string; qty: number };
export type QuoteState = { items: QuoteItem[] };
export type QuoteAction =
  | { type: "add"; productId: string }
  | { type: "remove"; productId: string }
  | { type: "setQty"; productId: string; qty: number }
  | { type: "clear" };

export const initialQuoteState: QuoteState = { items: [] };

export function quoteReducer(state: QuoteState, action: QuoteAction): QuoteState {
  switch (action.type) {
    case "add": {
      const existing = state.items.find((i) => i.productId === action.productId);
      if (existing) {
        return { items: state.items.map((i) => (i.productId === action.productId ? { ...i, qty: i.qty + 1 } : i)) };
      }
      return { items: [...state.items, { productId: action.productId, qty: 1 }] };
    }
    case "remove":
      return { items: state.items.filter((i) => i.productId !== action.productId) };
    case "setQty": {
      const qty = Math.floor(action.qty);
      if (!Number.isFinite(qty) || qty <= 0) {
        return { items: state.items.filter((i) => i.productId !== action.productId) };
      }
      const clamped = Math.min(9999, qty);
      return {
        items: state.items.map((i) => (i.productId === action.productId ? { ...i, qty: clamped } : i)),
      };
    }
    case "clear":
      return { items: [] };
    default:
      return state;
  }
}

export function quoteCount(state: QuoteState): number {
  return state.items.reduce((sum, item) => sum + item.qty, 0);
}
