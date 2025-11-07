import { create } from "zustand";
import { persist } from "zustand/middleware";

const API_BASE = "http://localhost:5000/api/"; // backend URL

export const useUserStore = create(
  persist(
    (set, get) => ({
      user: null,
      orders: [],
      customers: [],
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      addresses: [], // all saved addresses
      shippingAddresses: [], // array of shipping addresses
      selectedShippingAddressId: null, // selected address for checkout

      selectedAddress: null, // ✅ new state
      setSelectedAddress: (address) => set({ selectedAddress: address }), // ✅ setter

      // 🔹 Step 0: Set selected shipping address
      selectShippingAddress: (id) => set({ selectedShippingAddressId: id }),

      // 🔹 Step 1: Set shipping addresses
      setShippingAddresses: (addresses) =>
        set({ shippingAddresses: addresses }),

      requestOtp: async (email) => {
        set({ loading: true, error: null });
        try {
          console.log("📨 Sending OTP request for:", email);

          const res = await fetch(
            "http://localhost:5000/api/users/request-otp",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
              credentials: "include",
            }
          );

          const data = await res.json().catch(() => ({})); // in case backend doesn't return JSON

          if (!res.ok) {
            const msg = data.message || "Failed to send OTP";
            console.error("❌ OTP Request Error:", msg);
            throw new Error(msg);
          }

          console.log("✅ OTP sent successfully:", data);
          return data;
        } catch (err) {
          console.error("🚨 OTP request failed:", err.message);
          set({ error: err.message });
          throw err;
        } finally {
          set({ loading: false });
          console.log("🌀 Loading set to false");
        }
      },

      verifyOtp: async (email, otp) => {
        try {
          set({ loading: true, error: null });
          const res = await fetch(`${API_BASE}users/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp }),
            credentials: "include",
          });
          const data = await res.json();
          if (!res.ok) {
            const msg = data?.message || "Invalid OTP";
            set({ error: msg });
            throw new Error(msg);
          }

          let user = data.user ?? {
            _id: data._id ?? data.id ?? null,
            email: data.email ?? null,
            role: data.role ?? null,
          };

          const token = data.token ?? data.accessToken ?? null;

          set({
            user,
            token,
            isAuthenticated: true,
            error: null,
          });

          return { user, token, raw: data };
        } catch (err) {
          set({ error: err.message });
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      logout: async () => {
        try {
          const res = await fetch(`${API_BASE}users/logout`, {
            method: "POST",
            credentials: "include",
          });
          if (!res.ok) throw new Error("Logout failed");
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            addresses: [],
            shippingAddresses: [],
            selectedShippingAddressId: null,
          });
        } catch (error) {
          console.error("Logout error:", error);
        }
      },

      // 🔹 Step 3: Save new address
      saveAddress: async (address) => {
        try {
          set({ loading: true, error: null });
          const res = await fetch(`${API_BASE}users/saveAddress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(address),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Failed to add address");

          // Add to local shippingAddresses array
          set((state) => ({
            shippingAddresses: [
              ...state.shippingAddresses,
              { ...address, id: Date.now().toString() },
            ],
          }));

          return data.addresses;
        } catch (err) {
          set({ error: err.message });
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      // 🔹 Step 4: Fetch addresses (dummy for now)
      getAddresses: async () => {
        try {
          set({ loading: true, error: null });
          const res = await fetch(`${API_BASE}users/getAddresses`, {
            method: "GET",
            credentials: "include",
          });
          const data = await res.json();
          if (!res.ok)
            throw new Error(data.message || "Failed to fetch addresses");

          set({ addresses: data.addresses });
          return data.addresses;
        } catch (err) {
          set({ error: err.message });
          throw err;
        } finally {
          set({ loading: false });
        }
      },
      // 🔹 Step 5: Save selected shipping address to backend order
      saveShippingAddress: async (address) => {
        const { token } = get();
        try {
          set({ loading: true, error: null });

          const res = await fetch(`${API_BASE}order/shippingAddress`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`, // ✅ Token added
            },
            credentials: "include",
            body: JSON.stringify(address),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.message || "Failed to save shipping address");
          }

          const savedAddress = data.address || data;

          // ✅ Update selected address

          set((state) => ({
            selectedAddress: savedAddress, // ✅ Important
            shippingAddresses: [...state.shippingAddresses, savedAddress],
          }));

          return savedAddress;
        } catch (err) {
          console.error("❌ Save Shipping Address Error:", err);
          set({ error: err.message });
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      placeCODOrder: async () => {
        const { token, selectedAddress } = get();

        if (!selectedAddress) {
          throw new Error("No address selected"); // ✅ Safety check
        }

        console.log("📦 Placing COD order with address:", selectedAddress);

        const res = await fetch(`${API_BASE}order/cod`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            paymentMode: "COD",
            address: selectedAddress,
            // ✅ sending full address object
          }),
        });

        const data = await res.json();
        if (!res.ok)
          throw new Error(data.message || "Failed to place COD order");
        return data;
      },

      // ✅ FIXED Razorpay Implementation for UserStore

      createRazorpayOrder: async (amount) => {
        const { token } = get();
        try {
          set({ loading: true, error: null });

          const res = await fetch(`${API_BASE}payment/create-order`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ amount }), // amount in rupees
          });

          const data = await res.json();
          if (!res.ok)
            throw new Error(data.message || "Failed to create Razorpay order");

          console.log("✅ Razorpay Order Created:", data);
          return data.order; // ✅ Return the order object from response
        } catch (err) {
          console.error("❌ Razorpay Order Error:", err);
          set({ error: err.message });
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      initiateRazorpayPayment: async (amount) => {
        try {
          // ✅ Check if Razorpay is loaded
          if (!window.Razorpay) {
            throw new Error(
              "Razorpay SDK not loaded. Please check your internet connection."
            );
          }

          const orderData = await get().createRazorpayOrder(amount);

          // ✅ Return a promise that resolves with success status
          return new Promise((resolve, reject) => {
            const options = {
              // ✅ Import from config file
              key: "rzp_test_xxxxxxxxx", // 🔴 REPLACE THIS WITH YOUR ACTUAL KEY
              amount: orderData.amount,
              currency: orderData.currency,
              name: "URBAN MONKEY®",
              description: "Order Payment",
              order_id: orderData.id,
              handler: async function (response) {
                console.log("✅ Payment Success:", response);

                try {
                  const verifyRes = await fetch(
                    `${API_BASE}payment/verify-payment`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${get().token}`,
                      },
                      body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                      }),
                    }
                  );

                  const data = await verifyRes.json();
                  if (!verifyRes.ok)
                    throw new Error(
                      data.message || "Payment verification failed"
                    );

                  alert("✅ Payment successful and verified!");

                  // ✅ Fetch cart instance properly
                  const cartStore = await import("./CartSlice");
                  const { clearCart } = cartStore.default.getState();
                  if (clearCart) await clearCart();

                  // ✅ Resolve promise with success
                  resolve({
                    success: true,
                    paymentId: response.razorpay_payment_id,
                  });

                  // ✅ Redirect after a short delay
                  setTimeout(() => {
                    window.location.href = "/orders";
                  }, 1500);
                } catch (verifyErr) {
                  console.error("❌ Verification Error:", verifyErr);
                  alert("Payment verification failed: " + verifyErr.message);
                  reject(verifyErr);
                }
              },
              prefill: {
                name: get().user?.name || "",
                email: get().user?.email || "",
                contact: get().user?.phone || "",
              },
              theme: {
                color: "#000000", // Black theme for Urban Monkey
              },
              modal: {
                ondismiss: function () {
                  console.log("⚠️ Payment modal closed by user");
                  reject(new Error("Payment cancelled by user"));
                },
              },
            };

            const rzp = new window.Razorpay(options);

            rzp.on("payment.failed", function (response) {
              console.error("❌ Payment Failed:", response.error);
              alert(`Payment failed: ${response.error.description}`);
              reject(new Error(response.error.description));
            });

            rzp.open();
          });
        } catch (err) {
          console.error("❌ Payment Error:", err);
          alert("Payment initiation failed: " + err.message);
          throw err;
        }
      },

      fetchUsers: async () => {
        try {
          set({ loading: true, error: null });
          const res = await fetch(`${API_BASE}users/getAllUser`, {
            // ⚡ updated route
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${get().token}`,
            },
            credentials: "include",
          });
          const data = await res.json();

          if (!res.ok || !data.success)
            throw new Error(data.message || "Failed to fetch users");

          set({ customers: data.users || [] }); // ⚡ store me update
          return data.users;
        } catch (err) {
          set({ error: err.message });
          console.error("Fetch users error:", err);
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      fetchUserOrders: async () => {
        try {
          set({ loading: true, error: null });

          const res = await fetch(`${API_BASE}order/my-orders`, {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || "Failed to fetch orders");
          }

          const data = await res.json();

          set({ orders: data.orders || [], loading: false }); // ya data directly, depends on your API response
          console.log("✅ Orders fetched:", data);
        } catch (error) {
          console.error("❌ Error fetching orders:", error);
        }
      },

      // 🔹 Fetch all orders (Admin only)
      fetchAllOrders: async () => {
        const { token } = get();
        try {
          set({ loading: true, error: null });

          const res = await fetch(`${API_BASE}order/all-orders`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          });

          const data = await res.json();

          if (!res.ok)
            throw new Error(data.message || "Failed to fetch all orders");

          set({ orders: data.orders || [], loading: false });
          console.log("✅ All orders fetched:", data.orders);
          return data.orders;
        } catch (error) {
          console.error("❌ Error fetching all orders:", error);
          set({ error: error.message, loading: false });
        }
      },

      handleStatusChange: async (orderId, newStatus) => {
        const { token } = get();
        try {
          const res = await fetch(`${API_BASE}order/status/${orderId}`, {
            method: "PUT",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: newStatus }),
          });

          const data = await res.json();
          if (res.ok) {
            alert(`Order status updated to ${newStatus}`);
            await get().fetchUserOrders(); // ✅ refresh list
          } else {
            alert(data.message);
          }
        } catch (error) {
          console.error("❌ Update status error:", error);
        }
      },
      // 🟢 DASHBOARD SUMMARY (Admin Dashboard)
      dashboardStats: {
        totalProducts: 0,
        totalOrders: 0,
        totalCustomers: 0,
        recentOrders: [],
      },

      fetchDashboardSummary: async () => {
        const { token } = get();
        try {
          set({ loading: true, error: null });

          const res = await fetch(`${API_BASE}dash/dashboard`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          });

          const data = await res.json();

          if (!res.ok)
            throw new Error(
              data.message || "Failed to fetch dashboard summary"
            );

          set({
            dashboardStats: {
              totalProducts: data.totalProducts || 0,
              totalOrders: data.totalOrders || 0,
              totalCustomers: data.totalCustomers || 0,
              recentOrders: data.recentOrders || [],
            },
            loading: false,
          });

          console.log("✅ Dashboard Summary:", data);
          return data;
        } catch (err) {
          console.error("❌ Dashboard fetch error:", err);
          set({ error: err.message, loading: false });
        }
      },
    }),
    {
      name: "user-storage",
    }
  )
);
