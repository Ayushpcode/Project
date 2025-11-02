const Cart = require("../models/cartModel");
const Order = require("../models/orderModel");
const User = require("../models/userModel");
const mongoose = require("mongoose");

// ✅ Save/Update Shipping Address
const saveShippingAddress = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { fullName, phoneNumber, line1, line2, city, state, postalCode } =
      req.body;

    // ✅ Validate address
    if (!fullName || !phoneNumber || !line1 || !city || !state || !postalCode) {
      return res
        .status(400)
        .json({ message: "All required address fields must be provided" });
    }

    let order = await Order.findOne({ user: userId, status: "pending" });

    if (!order) {
      order = new Order({
        user: userId,
        status: "pending",
        paymentMethod: "COD",
        paymentStatus: "pending",
        items: [],
        totalPrice: 0,
      });
    }

    order.shippingAddress = {
      fullName,
      phoneNumber,
      line1,
      line2,
      city,
      state,
      postalCode,
    };

    await order.save();

    return res.status(200).json({
      message: "Shipping address saved successfully",
      shippingAddress: order.shippingAddress,
    });
  } catch (error) {
    console.error("❌ Save Shipping Address Error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const placeCODOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { totalPrice: clientTotal } = req.body;

    const cart = await Cart.findOne({ userId }).populate("products.productId");

    if (!cart || cart.products.length === 0) {
      return res.status(400).json({ message: "Cart is empty. Cannot place order." });
    }

    const backendTotal = cart.products.reduce((sum, item) => {
      const price = item.productId?.price || 0;
      return sum + price * item.quantity;
    }, 0);

    if (clientTotal && Math.abs(clientTotal - backendTotal) > 2) {
      console.warn("⚠️ Frontend and backend totals mismatch");
    }

    const shippingCharge = 50;
    const finalTotal = Math.round(backendTotal + shippingCharge);

    cart.totalPrice = finalTotal;
    await cart.save();

    const pendingOrder = await Order.findOne({ user: userId, status: "pending" });
    if (!pendingOrder || !pendingOrder.shippingAddress) {
      return res.status(400).json({ message: "No saved address found" });
    }

    const newOrder = await Order.create({
      user: userId,
      shippingAddress: pendingOrder.shippingAddress,
      items: cart.products.map((item) => ({
        productId: item.productId?._id || item.productId,
        name: item.productId?.name,
        quantity: item.quantity,
        size: item.size,
        price: item.productId?.price,
        image: item.productId?.image,
      })),
      totalPrice: finalTotal, 
      paymentMethod: "COD",
      paymentStatus: "pending",
      status: "pending",
    });

    cart.products = [];
    cart.totalPrice = 0;
    await cart.save();

    await pendingOrder.deleteOne();

    res.status(201).json({
      success: true,
      message: "✅ COD Order placed successfully",
      order: newOrder,
    });

  } catch (error) {
    console.error("❌ COD order error:", error);
    res.status(500).json({ message: "Server error while placing order" });
  }
};

const getAllUserOrders = async (req, res) => {
  try {

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 🔹 Fetch all orders of the logged-in user
    const orders = await Order.find({ user: userId })
      .populate("items.productId", "name brand price image")
      .sort({ createdAt: -1 }); // latest orders first

    return res.status(200).json({
      success: true,
      message: "User orders fetched successfully",
      totalOrders: orders.length,
      orders,
    });
  } catch (error) {
    console.error("❌ Error in getAllUserOrders:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};


module.exports = { saveShippingAddress, placeCODOrder, getAllUserOrders };
