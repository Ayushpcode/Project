const Cart = require("../models/cartModel");
const Product = require("../models/productModel");

// ✅ Add to Cart
const addToCart = async (req, res) => {
  try {
    const { productId, quantity, size } = req.body;
    const userId = req.user.id;

    const product = await Product.findById(productId);
    if (!product) {
      console.log("❌ Product not found");
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, products: [] });
    }

    const existingProduct = cart.products.find(
      (p) => p.productId.toString() === productId && p.size === size
    );

    if (existingProduct) {
      console.log("🟡 Product already in cart with same size. Increasing quantity.");
      existingProduct.quantity += quantity;
    } else {
      console.log("🆕 New product or size variant added to cart.");
      cart.products.push({ productId, quantity, size });
    }

    // ✅ Recalculate total
    const populatedCart = await cart.populate("products.productId");
    cart.totalPrice = populatedCart.products.reduce((sum, item) => {
      const price = item.productId?.price || 0;
      return sum + price * item.quantity;
    }, 0);

    await cart.save();

    return res.status(200).json({ success: true, cart });
  } catch (error) {
    console.error("❌ Add to Cart Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};




// ✅ Get Cart
const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId }).populate({
      path: "products.productId",
      select: "name price image brand sizes category subcategory",
    });

    if (!cart) {
      return res.status(200).json({ success: true, cart: { products: [] } });
    }

    cart.products.forEach((p) => {
      console.log(`➡️ ${p.productId?.name} | Size: ${p.size} | Qty: ${p.quantity}`);
    });

    res.status(200).json({
      success: true,
      cart: {
        _id: cart._id,
        userId: cart.userId,
        totalPrice: cart.totalPrice,
        products: cart.products.map((p) => ({
          _id: p._id,
          productId: p.productId,
          quantity: p.quantity,
          size: p.size, 
        })),
      },
    });
  } catch (error) {
    console.error("❌ Get Cart Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// ✅ Remove Product from Cart
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id;

    let cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    cart.products = cart.products.filter((p) => p.productId.toString() !== productId);

    await cart.save();
    res.status(200).json({ success: true, cart });
  } catch (error) {
    console.error("Remove Cart error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateCartQuantity = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    if (quantity < 1) {
      return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    const productInCart = cart.products.find((p) => p.productId.toString() === productId);

    if (!productInCart) {
      return res.status(404).json({ success: false, message: "Product not in cart" });
    }

    productInCart.quantity = quantity; // update karega

    await cart.save();
    res.status(200).json({ success: true, cart });
  } catch (error) {
    console.error("Update Cart Quantity error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


module.exports = {
  addToCart,
  getCart,
  removeFromCart,
  updateCartQuantity,
};
