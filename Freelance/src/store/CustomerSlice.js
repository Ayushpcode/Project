import { create } from "zustand";

const API_BASE = "http://localhost:5000/api/admin";

export const useCustomerStore = create((set, get) => ({
  customers: [],
  selectedCustomer: null,
  loading: false,
  error: null,

  // ✅ Fetch all customers
  fetchCustomers: async () => {
    try {
      set({ loading: true, error: null });
      const res = await fetch(`${API_BASE}/allCustomer`, {
        credentials: "include", // ✅ Include cookies in request
      });
      const data = await res.json();

      console.log("Fetched customers response:", data);

      const customersArray = Array.isArray(data)
        ? data
        : data.customers || [];

      set({ customers: customersArray, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // ✅ Fetch single customer by ID
  fetchCustomerById: async (id) => {
    try {
      set({ loading: true, error: null });
      const res = await fetch(`${API_BASE}/getCustomer/${id}`, {
        credentials: "include", // ✅ Include cookies
      });
      const data = await res.json();
      set({ selectedCustomer: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // ✅ Delete customer
  deleteCustomer: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/deleteCustomer/${id}`, {
        method: "DELETE",
        credentials: "include", // ✅ Include cookies
      });

      if (!res.ok) throw new Error("Failed to delete customer");

      set({
        customers: get().customers.filter((c) => c._id !== id),
      });
    } catch (err) {
      set({ error: err.message });
    }
  },

  // ✅ Clear selected customer
  clearSelected: () => set({ selectedCustomer: null }),
}));