const User = require("../models//userModel");
const Order = require("../models/orderModel");

exports.getAllCustomers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" });
    const customers = await Promise.all(
      users.map(async (u) => {
        const orders = await Order.find({ user: u._id });
        const totalSpent = orders.reduce((sum, o) => sum + o.totalPrice, 0);
        const lastOrder = orders.sort((a, b) => b.createdAt - a.createdAt)[0];

        return {
          id: u._id,
          name: u.email.split("@")[0],
          email: u.email,
          phone: u.addresses[0]?.phoneNumber || "N/A",
          joinDate: u.createdAt,
          totalOrders: orders.length,
          totalSpent,
          lastOrderDate: lastOrder?.createdAt || null,
          status: u.status,
        };
      })
    );

    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: "Error fetching customers", error: err });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Customer not found" });

    const orders = await Order.find({ user: user._id }).populate("items.productId");

    res.json({
      id: user._id,
      name: user.email.split("@")[0],
      email: user.email,
      phone: user.addresses[0]?.phoneNumber || "N/A",
      joinDate: user.createdAt,
      totalOrders: orders.length,
      totalSpent: orders.reduce((s, o) => s + o.totalPrice, 0),
      lastOrderDate: orders.sort((a, b) => b.createdAt - a.createdAt)[0]?.createdAt,
      status: user.status,
      orders,
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching customer details", error: err });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Customer not found" });

    await Order.deleteMany({ user: user._id });
    await user.deleteOne();

    res.json({ message: "Customer and their orders deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting customer", error: err });
  }
};


