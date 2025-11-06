import React, { useEffect } from "react";
import { Trash2, Mail, Phone, Eye } from "lucide-react";
import { useCustomerStore } from "../../store/CustomerSlice"; // Zustand store import

export function CustomerManagement() {
  const {
    customers,
    fetchCustomers,
    fetchCustomerById,
    deleteCustomer,
    selectedCustomer,
    clearSelected,
    loading,
    error,
  } = useCustomerStore();

  // ✅ Fetch all customers on mount
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // ✅ Handle delete customer
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      await deleteCustomer(id);
    }
  };

  // ✅ Handle view customer details
  const handleView = async (id) => {
    await fetchCustomerById(id);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">
          👥 Customer Management
        </h2>
      </div>

      {/* ✅ Loading & Error States */}
      {loading && <p className="text-gray-600">Loading customers...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {/* ✅ Customer Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {customers.length === 0 && !loading && (
          <p className="text-gray-500">No customers found.</p>
        )}

        {customers.map((customer) => (
          <div
            key={customer._id || customer.id}
            className="p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg text-gray-800 mb-2">
                  {customer.email ? customer.email.split("@")[0] : "Unnamed"}
                </h3>

                <div className="space-y-1 text-sm text-gray-600">
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={15} /> <span>{customer.email}</span>
                    </div>
                  )}

                  {customer.addresses?.[0]?.phoneNumber && (
                    <div className="flex items-center gap-2">
                      <Phone size={15} />
                      <span>{customer.addresses[0].phoneNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleDelete(customer._id || customer.id)}
                className="p-2 border rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600 transition"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="mt-5 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="text-xl font-bold text-gray-800">
                  {customer.status || "Unknown"}
                </p>
              </div>
              <button
                onClick={() => handleView(customer._id || customer.id)}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-100 transition flex items-center gap-1"
              >
                <Eye size={14} />
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ✅ Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-800">
                {selectedCustomer.email || "Customer Details"}
              </h3>
              <button
                onClick={clearSelected}
                className="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="mb-6 space-y-2 text-gray-700">
              <p>
                <strong>Status:</strong>{" "}
                {selectedCustomer.status || "Unknown"}
              </p>
              <p>
                <strong>Joined:</strong>{" "}
                {selectedCustomer.createdAt
                  ? new Date(selectedCustomer.createdAt).toLocaleDateString()
                  : "N/A"}
              </p>

              {selectedCustomer.addresses?.length > 0 && (
                <>
                  <p className="font-semibold mt-4">📍 Address:</p>
                  <p>{selectedCustomer.addresses[0].line1}</p>
                  <p>
                    {selectedCustomer.addresses[0].city},{" "}
                    {selectedCustomer.addresses[0].state}
                  </p>
                  <p>{selectedCustomer.addresses[0].postalCode}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
