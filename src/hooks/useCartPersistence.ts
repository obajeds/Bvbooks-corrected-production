import { useState, useEffect, useCallback, useRef } from "react";

const CART_STORAGE_KEY = "pos_active_cart";
const SAVED_CARTS_KEY = "pos_saved_carts";
const ACTIVE_CART_TTL_MS = 60 * 60 * 1000; // 1 hour for active carts
const HELD_CART_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours for held carts

interface CartItem {
  id: string;
  name: string;
  price: number;
  cost_price?: number;
  stock: number;
  quantity: number;
  sku: string | null;
  unit: string;
  sellMode: "quantity" | "price";
  allowsPriceSale: boolean;
  allowsDecimal: boolean;
  enteredPrice?: number;
  priceAtTimeAdded?: number;
}

interface PersistedCart {
  items: CartItem[];
  savedAt: number;
}

export interface SavedCart {
  id: string;
  label: string;
  items: CartItem[];
  savedAt: number;
}

function loadPersistedCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed: PersistedCart = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > ACTIVE_CART_TTL_MS) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return [];
    }
    return parsed.items;
  } catch {
    return [];
  }
}

function loadSavedCarts(): SavedCart[] {
  try {
    const raw = localStorage.getItem(SAVED_CARTS_KEY);
    if (!raw) return [];
    const carts: SavedCart[] = JSON.parse(raw);
    // Filter out expired carts
    const valid = carts.filter(c => Date.now() - c.savedAt <= HELD_CART_TTL_MS);
    if (valid.length !== carts.length) {
      localStorage.setItem(SAVED_CARTS_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch {
    return [];
  }
}

export function useCartPersistence() {
  const [cart, setCartState] = useState<CartItem[]>(() => loadPersistedCart());
  const [savedCarts, setSavedCarts] = useState<SavedCart[]>(() => loadSavedCarts());
  const isInitialized = useRef(false);

  // Persist active cart to localStorage on change (skip initial load)
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      return;
    }
    if (cart.length === 0) {
      localStorage.removeItem(CART_STORAGE_KEY);
    } else {
      const persisted: PersistedCart = { items: cart, savedAt: Date.now() };
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(persisted));
    }
  }, [cart]);

  // Persist saved carts
  useEffect(() => {
    localStorage.setItem(SAVED_CARTS_KEY, JSON.stringify(savedCarts));
  }, [savedCarts]);

  const setCart: React.Dispatch<React.SetStateAction<CartItem[]>> = useCallback((action) => {
    setCartState(action);
  }, []);

  const clearCart = useCallback(() => {
    setCartState([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  // Save current cart aside with a label and clear active cart
  const saveCart = useCallback((label?: string) => {
    if (cart.length === 0) return;
    const newSaved: SavedCart = {
      id: crypto.randomUUID(),
      label: label || `Customer ${savedCarts.length + 1}`,
      items: [...cart],
      savedAt: Date.now(),
    };
    setSavedCarts(prev => [...prev, newSaved]);
    setCartState([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, [cart, savedCarts.length]);

  // Load a saved cart back into active cart (current cart is replaced)
  const loadSavedCart = useCallback((cartId: string) => {
    const found = savedCarts.find(c => c.id === cartId);
    if (!found) return;
    // If current cart has items, save it first
    if (cart.length > 0) {
      const autoSaved: SavedCart = {
        id: crypto.randomUUID(),
        label: `Auto-saved`,
        items: [...cart],
        savedAt: Date.now(),
      };
      setSavedCarts(prev => [...prev.filter(c => c.id !== cartId), autoSaved]);
    } else {
      setSavedCarts(prev => prev.filter(c => c.id !== cartId));
    }
    setCartState(found.items);
  }, [savedCarts, cart]);

  const deleteSavedCart = useCallback((cartId: string) => {
    setSavedCarts(prev => prev.filter(c => c.id !== cartId));
  }, []);

  return {
    cart,
    setCart,
    clearCart,
    savedCarts,
    saveCart,
    loadSavedCart,
    deleteSavedCart,
  };
}
