import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState({});

    const addToCart = (product) => {
        setCart(prev => ({
            ...prev,
            [product.id]: {
                ...product,
                qty: (prev[product.id]?.qty || 0) + 1
            }
        }));
    };

    const decreaseQty = (productId) => {
        setCart(prev => {
            const currentQty = prev[productId]?.qty || 0;
            if (currentQty <= 1) {
                const newCart = { ...prev };
                delete newCart[productId];
                return newCart;
            }
            return {
                ...prev,
                [productId]: { ...prev[productId], qty: currentQty - 1 }
            };
        });
    };

    const removeFromCart = (productId) => {
        setCart(prev => {
            const newCart = { ...prev };
            delete newCart[productId];
            return newCart;
        });
    };

    const clearCart = () => setCart({});

    const getCartCount = () => Object.values(cart).reduce((a, b) => a + b.qty, 0);

    const getCartTotal = () => Object.values(cart).reduce((a, b) => a + (b.price * b.qty), 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, decreaseQty, removeFromCart, clearCart, getCartCount, getCartTotal }}>
            {children}
        </CartContext.Provider>
    );
};