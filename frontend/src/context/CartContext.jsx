import { createContext, useContext, useReducer } from 'react';

const CartContext = createContext(null);

const cartReducer = (state, action) => {
    switch (action.type) {
        case 'ADD_ITEM': {
            const existing = state.items.find(i => i.product_id === action.payload.product_id);
            if (existing) {
                return {
                    ...state,
                    items: state.items.map(i =>
                        i.product_id === action.payload.product_id
                            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.product_price }
                            : i
                    )
                };
            }
            return {
                ...state,
                items: [...state.items, { ...action.payload, points_earned: action.payload.points_earned || 0, quantity: 1, subtotal: action.payload.product_price }]
            };
        }
        case 'UPDATE_QTY': {
            const { product_id, qty } = action.payload;
            if (qty <= 0) {
                return { ...state, items: state.items.filter(i => i.product_id !== product_id) };
            }
            return {
                ...state,
                items: state.items.map(i =>
                    i.product_id === product_id
                        ? { ...i, quantity: qty, subtotal: qty * i.product_price }
                        : i
                )
            };
        }
        case 'REMOVE_ITEM':
            return { ...state, items: state.items.filter(i => i.product_id !== action.payload) };
        case 'CLEAR':
            return { items: [] };
        default:
            return state;
    }
};

export const CartProvider = ({ children }) => {
    const [state, dispatch] = useReducer(cartReducer, { items: [] });

    const total = state.items.reduce((sum, i) => sum + i.subtotal, 0);
    const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <CartContext.Provider value={{ items: state.items, total, itemCount, dispatch }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
