import { create } from "zustand"
import { persist } from "zustand/middleware"

const API_BASE = "http://localhost:5000/api"

const useCartStore = create(
  persist(
    (set, get) => ({
      cartItems: [],
      loading: false,
      error: null,

      // ✅ Fetch cart
      fetchCart: async () => {
        set({ loading: true, error: null })
        try {
          const res = await fetch(`${API_BASE}/cart/getCart`, {
            method: "GET",
            credentials: "include",
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.message || "Failed to fetch cart")

          set({ cartItems: data.cart.products || [], loading: false })
        } catch (err) {
          set({ error: err.message, loading: false })
        }
      },

      // ✅ Add to cart
      addToCart: async (productId, quantity = 1, size) => {
        set({ loading: true, error: null })
        try {
          const res = await fetch(`${API_BASE}/cart/addToCart`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId, quantity, size }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.message || "Failed to add to cart")

          // Refresh cart
          await get().fetchCart()
        } catch (err) {
          set({ error: err.message, loading: false })
        }
      },

      // ✅ Update quantity
      updateCart: async (productId, quantity) => {
        set({ loading: true, error: null })
        try {
          const res = await fetch(`${API_BASE}/cart/updateCart`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId, quantity }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.message || "Failed to update cart")

          await get().fetchCart()
        } catch (err) {
          set({ error: err.message, loading: false })
        }
      },

      // ✅ Remove product
      removeFromCart: async (productId) => {
        set({ loading: true, error: null })
        try {
          const res = await fetch(`${API_BASE}/cart/removeFromCart`, {
            method: "DELETE",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.message || "Failed to remove item")

          await get().fetchCart()
        } catch (err) {
          set({ error: err.message, loading: false })
        }
      },
      clearCart: () => set({ cartItems: [] }),
    }),
    {
      name: "cart-store", // localStorage key
    }
  )
)

export default useCartStore
