const Razorpay = require("razorpay");
const crypto = require("crypto");
const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const Product = require("../models/productModel");
const User = require("../models/userModel");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ======================================================
// ✅ Create Razorpay Order
// ======================================================
exports.createOrder = async (req, res) => {
  try {
    const { amount, currency = "INR" } = req.body;
    const user = req.user;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    const options = {
      amount: amount * 100, // Convert to paise
      currency,
      receipt: `receipt_${user._id}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      order: {
        ...order,
        key_id: process.env.RAZORPAY_KEY_ID,
      },
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating Razorpay order", error: error.message });
  }
};

// ======================================================
// ✅ Verify Razorpay Payment - WITH WELCOME COUPON FIX
// ======================================================
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderDetails,
    } = req.body;

    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Step 1: Verify payment signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    // Step 2: Fetch user to check hasOrdered flag BEFORE processing
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ FIX: Check if user has already ordered
    const isFirstOrder = !user.hasOrdered;

    // Step 3: Fetch user cart
    const cart = await Cart.findOne({ userId }).populate("products.productId");
    if (!cart || cart.products.length === 0) {
      return res.status(400).json({ message: "Cart is empty. Cannot place order." });
    }

    // Step 4: Size-wise stock validation & deduction
    const stockUpdates = [];
    for (const item of cart.products) {
      const product = await Product.findById(item.productId._id);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.productId?.name || "Unknown"}` });
      }

      const sizeObj = product.sizes.find(s => s.size === item.size);
      if (!sizeObj) {
        return res.status(400).json({ message: `Size "${item.size}" not available for "${product.name}"` });
      }

      if (sizeObj.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}" (Size ${item.size})`,
        });
      }

      sizeObj.stock -= item.quantity;
      await product.save();

      stockUpdates.push({
        productName: product.name,
        size: item.size,
        newStock: sizeObj.stock,
      });
    }

    // Step 5: Calculate total with discount
    const backendTotal = cart.products.reduce(
      (sum, item) => sum + (item.productId?.price || 0) * item.quantity,
      0
    );

    const shippingCharge = 15;
    const deliveryCharge = 50;
    
    // ✅ FIX: Apply 5% discount ONLY for first-time buyers
    const discount = isFirstOrder ? Math.round(backendTotal * 0.05) : 0;
    const finalTotal = Math.round(backendTotal + shippingCharge + deliveryCharge - discount);

    // Step 6: Validate shipping address
    if (!orderDetails?.shippingAddress) {
      return res.status(400).json({ message: "Shipping address is required" });
    }

    // Step 7: Create new order in DB
    const newOrder = new Order({
      user: userId,
      items: cart.products.map((item) => ({
        productId: item.productId._id,
        name: item.productId.name,
        price: item.productId.price,
        quantity: item.quantity,
        size: item.size,
        image: item.productId.primaryImage?.url || item.productId.image,
      })),
      shippingAddress: orderDetails.shippingAddress,
      totalPrice: finalTotal,
      discountApplied: discount, // ✅ ADD: Store discount in order record
      paymentMethod: "Razorpay",
      paymentStatus: "paid",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      paidAt: new Date(),
      status: "pending",
    });

    await newOrder.save();

    // ✅ FIX: Update user's hasOrdered flag ONLY if it's their first order
    if (isFirstOrder) {
      user.hasOrdered = true;
      await user.save();
    }

    // Step 8: Clear cart
    cart.products = [];
    cart.totalPrice = 0;
    await cart.save();

    // Step 9: Respond success
    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      orderId: newOrder._id,
      stockUpdates,
      discountApplied: discount,
      isFirstOrder: isFirstOrder, // ✅ ADD: Send this to frontend
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during payment verification",
      error: error.message,
    });
  }
};

// ======================================================
// ✅ Create Order Directly in DB (Manual Fallback)
// ======================================================
exports.createOrderInDB = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      totalAmount,
      paymentMethod,
      razorpayOrderId,
      razorpayPaymentId,
    } = req.body;

    const userId = req.user?._id || req.user?.id;
    
    // ✅ FIX: Check if user has already ordered
    const user = await User.findById(userId);
    const isFirstOrder = !user.hasOrdered;

    const order = await Order.create({
      userId: userId,
      items,
      shippingAddress,
      totalAmount,
      paymentMethod,
      paymentStatus: "paid",
      razorpayOrderId,
      razorpayPaymentId,
      orderStatus: "processing",
    });

    // ✅ FIX: Update hasOrdered flag ONLY if it's their first order
    if (isFirstOrder) {
      await User.findByIdAndUpdate(userId, { hasOrdered: true });
    }

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      orderId: order._id,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating order in database",
      error: error.message,
    });
  }
};

// ======================================================
// ✅ NEW: Check if user is eligible for welcome discount
// ======================================================
exports.checkWelcomeDiscount = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      isEligible: !user.hasOrdered,
      discountPercentage: !user.hasOrdered ? 5 : 0,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error checking discount eligibility",
      error: error.message,
    });
  }
};