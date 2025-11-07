const Cart = require("../models/cartModel");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
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

// ✅ Place COD Order with Size-Based Stock Management
const placeCODOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { totalPrice: clientTotal } = req.body;

    // Fetch cart with products
    const cart = await Cart.findOne({ userId }).populate("products.productId");

    if (!cart || cart.products.length === 0) {
      return res.status(400).json({ message: "Cart is empty. Cannot place order." });
    }

    console.log("🔍 Starting order placement...");
    console.log("🔍 Cart items:", cart.products.length);

    // ✅ Step 1: Validate and deduct size-specific stock for all products
    const stockUpdates = [];
    
    for (const item of cart.products) {
      const product = await Product.findById(item.productId._id);
      
      if (!product) {
        return res.status(404).json({
          message: `Product not found: ${item.productId?.name || "Unknown"}`
        });
      }

      console.log(`🔍 Processing: ${product.name} | Size: ${item.size} | Qty: ${item.quantity}`);

      // Find the specific size in the product's sizes array
      const sizeObj = product.sizes.find(s => s.size === item.size);
      
      if (!sizeObj) {
        return res.status(400).json({
          message: `Size "${item.size}" not available for product "${product.name}"`
        });
      }

      console.log(`🔍 Current stock for ${product.name} (Size ${item.size}): ${sizeObj.stock}`);

      // Check if sufficient stock exists for this size
      if (sizeObj.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}" - Size ${item.size}. Available: ${sizeObj.stock}, Requested: ${item.quantity}`
        });
      }

      // ✅ Deduct stock for this specific size
      const oldStock = sizeObj.stock;
      sizeObj.stock -= item.quantity;
      
      await product.save();
      
      console.log(`✅ Stock deducted: ${product.name} (Size ${item.size}) - ${oldStock} → ${sizeObj.stock}`);
      
      stockUpdates.push({
        productName: product.name,
        size: item.size,
        oldStock,
        newStock: sizeObj.stock,
        quantityDeducted: item.quantity
      });
    }

    // Calculate totals
    const backendTotal = cart.products.reduce((sum, item) => {
      const price = item.productId?.price || 0;
      return sum + price * item.quantity;
    }, 0);

    if (clientTotal && Math.abs(clientTotal - backendTotal) > 2) {
      console.warn("⚠️ Frontend and backend totals mismatch");
    }

    const shippingCharge = 15;
    const deliveryCharges = 50;
    const finalTotal = Math.round(backendTotal + shippingCharge + deliveryCharges);

    cart.totalPrice = finalTotal;
    await cart.save();

    // Get shipping address
    const pendingOrder = await Order.findOne({ user: userId, status: "pending" });
    if (!pendingOrder || !pendingOrder.shippingAddress) {
      return res.status(400).json({ message: "No saved address found" });
    }

    // ✅ Create the order
    const newOrder = new Order({
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

    await newOrder.save();
    console.log("✅ Order created:", newOrder.customOrderId);

    // Clear cart
    cart.products = [];
    cart.totalPrice = 0;
    await cart.save();

    // Delete the pending order used for address storage
    await Order.deleteOne({ _id: pendingOrder._id });

    console.log("✅ Stock updates summary:", stockUpdates);

    res.status(201).json({
      success: true,
      message: "✅ COD Order placed successfully and stock updated",
      order: newOrder,
      stockUpdates // Debug info
    });

  } catch (error) {
    console.error("❌ COD order error:", error);
    res.status(500).json({ 
      message: "Server error while placing order",
      error: error.message 
    });
  }
};

// ✅ Get all user orders
const getAllUserOrders = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const orders = await Order.find({ user: userId })
      .populate("items.productId", "name brand price image")
      .sort({ createdAt: -1 });

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

// ✅ Get all orders (for admin)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("items.productId", "name brand price image")
      .sort({ createdAt: -1 });

    if (!orders.length) {
      return res.status(404).json({ message: "No orders found" });
    }

    res.status(200).json({
      success: true,
      message: "All orders fetched successfully",
      totalOrders: orders.length,
      orders,
    });
  } catch (error) {
    console.error("❌ Error in getAllOrders:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while fetching all orders",
    });
  }
};

// ✅ Update order status (admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "shipping", "delivered", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = status;
    await order.save();

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      updatedOrder: order,
    });
  } catch (error) {
    console.error("❌ Error updating order status:", error);
    res.status(500).json({ message: "Server error while updating order status" });
  }
};

module.exports = {
  saveShippingAddress,
  placeCODOrder,
  getAllUserOrders,
  updateOrderStatus,
  getAllOrders
};