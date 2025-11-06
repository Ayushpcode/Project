const Product = require("../models/productModel");
const cloudinary = require("../utils/cloudinary");

// Helper function: calculate status based on total stock
const calculateStatus = (sizes) => {
  const totalStock = sizes.reduce((sum, s) => sum + (s.stock || 0), 0);
  if (totalStock === 0) return "Out of Stock";
  if (totalStock < 15) return "Limited";
  return "Active";
};

const addProduct = async (req, res) => {
  try {
    console.log("========== ADD PRODUCT REQUEST ==========");
    console.log("📦 Body:", req.body);
    console.log("📁 File:", req.file);

    const { name, brand, price, category, subcategory, sizes, description } =
      req.body;

    // Validation for required fields
    if (!name || !brand || !price || !category || !subcategory || !sizes) {
      console.error("❌ Missing required fields");
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    // Parse sizes
    let parsedSizes;
    try {
      parsedSizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;
    } catch (parseError) {
      console.error("❌ Failed to parse sizes:", parseError);
      return res.status(400).json({
        success: false,
        message: "Invalid sizes format",
      });
    }

    if (!Array.isArray(parsedSizes) || parsedSizes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Sizes array is required",
      });
    }

    // Handle Cloudinary Upload
    let imageUrl = "https://via.placeholder.com/400x400?text=No+Image";

    if (req.file) {
      console.log("📤 Uploading to Cloudinary...");

      try {
        // ✅ Convert buffer to base64 data URI
        const base64Image = `data:${
          req.file.mimetype
        };base64,${req.file.buffer.toString("base64")}`;

        const result = await cloudinary.uploader.upload(base64Image, {
          folder: "products",
          resource_type: "image",
        });

        imageUrl = result.secure_url;
        console.log("✅ Image uploaded:", imageUrl);
      } catch (uploadError) {
        console.error("❌ Failed to upload to Cloudinary:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload image to Cloudinary",
          error: uploadError.message,
        });
      }
    } else if (req.body.image && req.body.image.trim()) {
      imageUrl = req.body.image;
      console.log("📷 Using existing image URL:", imageUrl);
    }

    // Determine stock status automatically
    const status = calculateStatus(parsedSizes);

    // Create and Save Product
    const newProduct = new Product({
      name,
      brand,
      price,
      category: category.toLowerCase(),
      subcategory,
      description: description || "",
      sizes: parsedSizes,
      image: imageUrl,
      status,
    });

    await newProduct.save();
    console.log("✅ Product saved to database:", newProduct._id);

    return res.status(201).json({
      success: true,
      message: "✅ Product added successfully!",
      product: newProduct,
    });
  } catch (err) {
    console.error("❌ Add Product error:", err);
    console.error("❌ Error stack:", err.stack);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// ✅ Get All Products
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({ success: true, products });
  } catch (error) {
    console.error("Get All Products error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get Product by ID
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, product });
  } catch (error) {
    console.error("Get Product error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Update Product
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    const { name, brand, price, category, subcategory, sizes, description } =
      req.body;
    console.log("📦 Product ID:", req.params.id);
    console.log("📥 Received body:", req.body);
    console.log("📥 Received file:", req.file);
    console.log("🔧 Current product before update:", product);

    if (name) product.name = name;
    if (brand) product.brand = brand;
    if (price) product.price = price;
    if (category) product.category = category;
    if (subcategory) product.subcategory = subcategory;
    if (description) product.description = description;

    if (sizes) {
      const parsedSizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;
      product.sizes = parsedSizes;
      console.log("✅ Updated sizes:", product.sizes);
    }

    // ✅ Handle image upload
    if (req.file) {
      console.log("📤 Uploading to Cloudinary...");

      try {
        // ✅ Convert buffer to base64 data URI
        const base64Image = `data:${
          req.file.mimetype
        };base64,${req.file.buffer.toString("base64")}`;

        const result = await cloudinary.uploader.upload(base64Image, {
          folder: "products",
          resource_type: "image",
        });

        product.image = result.secure_url; // ✅ Fixed: assign to product.image, not imageUrl
        console.log("✅ Image uploaded:", product.image);
      } catch (uploadError) {
        console.error("❌ Failed to upload to Cloudinary:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload image to Cloudinary",
          error: uploadError.message,
        });
      }
    }

    // Update status
    product.status = calculateStatus(product.sizes);
    console.log("✅ Updated status:", product.status);

    await product.save();

    console.log("💾 Saved product:", product);

    res.status(200).json({ success: true, product });
  } catch (error) {
    console.error("Update Product error:", error.message);
    console.error("Update Product error stack:", error.stack); // ✅ Added stack trace
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// ✅ Delete Product
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res
      .status(200)
      .json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete Product error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Check if product exists
const checkProductExists = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    res.status(200).json({ exists: !!product });
  } catch (error) {
    console.error("Check Product error:", error.message);
    res.status(500).json({ exists: false, message: "Server error" });
  }
};

module.exports = {
  addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  checkProductExists,
};
