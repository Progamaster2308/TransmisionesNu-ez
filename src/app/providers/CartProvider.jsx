import { createContext, useMemo, useState } from 'react';


const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addToCart = (product) => {
    if (!product?.id) return;
    const stock = Number(product.stock ?? 0);

    setItems((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        if (existing.cantidad >= stock) return prev;
        return prev.map((p) => (p.id === product.id ? { ...p, cantidad: p.cantidad + 1 } : p));
      }

      if (stock <= 0) return prev;
      return [...prev, { ...product, cantidad: 1 }];
    });
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((p) => p.id !== productId));
  };

  const clearCart = () => setItems([]);

  const updateQty = (productId, qty) => {
    const q = Math.max(1, Math.floor(Number(qty) || 1));
    setItems((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const stock = Number(p.stock ?? 0);
        const bounded = stock > 0 ? Math.min(q, stock) : q;
        return { ...p, cantidad: bounded };
      })
    );
  };

  const value = useMemo(
    () => ({ items, addToCart, removeItem, clearCart, updateQty }),
    [items]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export default CartContext;

