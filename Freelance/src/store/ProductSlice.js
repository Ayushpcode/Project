import { create } from "zustand";
import { persist } from "zustand/middleware";

const API_BASE = "http://localhost:5000/api";

const useProductStore = create(
  persist(
    (set, get) => ({
      products: [],
      loading: false,
      error: null,

      fetchProducts: async () => {
        set({ loading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/product/getAllProduct`);
          if (!res.ok) throw new Error("Failed to fetch products");

          const data = await res.json();
          set({ products: data.products || [], loading: false });
        } catch (err) {
          set({ error: err.message, loading: false });
          throw err;
        }
      },

      getProductById: async (id) => {
        try {
          const existingProduct = get().products.find((p) => p._id === id);
          if (existingProduct) return existingProduct;

          set({ loading: true, error: null });

          const res = await fetch(`${API_BASE}/product/getProductById/${id}`, {
            credentials: "include",
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || "Failed to fetch product");
          }

          const data = await res.json();
          const product = data.product || data;

          set((state) => ({
            products: [...state.products, product],
            loading: false,
          }));

          return product;
        } catch (err) {
          set({ error: err.message, loading: false });
          throw err;
        }
      },

      addProduct: async (productData) => {
        try {
          set({ loading: true, error: null });

          // ✅ Check if productData is already FormData
          let formData;
          if (productData instanceof FormData) {
            formData = productData;
          } else {
            // Create FormData from plain object
            formData = new FormData();
            
            if (productData.name) formData.append('name', productData.name);
            if (productData.brand) formData.append('brand', productData.brand);
            if (productData.price) formData.append('price', productData.price);
            if (productData.category) formData.append('category', productData.category);
            if (productData.subcategory) formData.append('subcategory', productData.subcategory);
            if (productData.description) formData.append('description', productData.description);
            if (productData.status) formData.append('status', productData.status);
            
            if (productData.sizes) {
              formData.append('sizes', JSON.stringify(productData.sizes));
            }
            
            if (productData.image instanceof File) {
              formData.append('image', productData.image);
            } else if (typeof productData.image === 'string') {
              formData.append('image', productData.image);
            }
          }

          console.log('📤 Adding product...');

          const res = await fetch(`${API_BASE}/product/addProduct`, {
            method: "POST",
            credentials: "include",
            body: formData,
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || "Failed to add product");
          }

          const data = await res.json();
          console.log('✅ Product added:', data);
          const product = data.product || data;

          set((state) => ({
            products: [...state.products, product],
            loading: false,
          }));

          return product;
        } catch (err) {
          console.error('❌ Add product error:', err);
          set({ error: err.message, loading: false });
          throw err;
        }
      },

      updateProduct: async (id, productData) => {
        try {
          set({ loading: true, error: null });

          // ✅ Check if productData is already FormData
          let formData;
          if (productData instanceof FormData) {
            formData = productData;
          } else {
            // Create FormData from plain object
            formData = new FormData();

            if (productData.name) formData.append('name', productData.name);
            if (productData.brand) formData.append('brand', productData.brand);
            if (productData.price) formData.append('price', productData.price);
            if (productData.category) formData.append('category', productData.category);
            if (productData.subcategory) formData.append('subcategory', productData.subcategory);
            if (productData.description) formData.append('description', productData.description);
            if (productData.status) formData.append('status', productData.status);
            
            if (productData.sizes) {
              formData.append('sizes', JSON.stringify(productData.sizes));
            }
            
            if (productData.image instanceof File) {
              formData.append('image', productData.image);
              console.log('📷 New image file to upload');
            }
          }

          console.log('📤 Updating product ID:', id);

          const res = await fetch(`${API_BASE}/product/updateProduct/${id}`, {
            method: "PUT",
            credentials: "include",
            body: formData,
          });

          console.log('📥 Response status:', res.status);

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('❌ Error response:', errorData);
            throw new Error(
              errorData.message || `Failed to update product (${res.status})`
            );
          }

          const data = await res.json();
          console.log('✅ Update response:', data);
          const updatedProduct = data.product || data;

          // ✅ Update the product in state
          set((state) => ({
            products: state.products.map((p) =>
              p._id === id ? updatedProduct : p
            ),
            loading: false,
          }));

          console.log('✅ Product updated in state');
          return updatedProduct;
        } catch (err) {
          console.error('❌ Update error:', err);
          set({ error: err.message, loading: false });
          throw err;
        }
      },

      deleteProduct: async (id) => {
        try {
          set({ loading: true, error: null });

          const res = await fetch(`${API_BASE}/product/deleteProduct/${id}`, {
            method: "DELETE",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || "Failed to delete product");
          }

          set((state) => ({
            products: state.products.filter((p) => p._id !== id),
            loading: false,
          }));
        } catch (err) {
          set({ error: err.message, loading: false });
          throw err;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "product-store",
      partialState: (state) => ({ products: state.products }),
    }
  )
);

export default useProductStore;