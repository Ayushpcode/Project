const express = require("express");
const router = express.Router();

const {
  addProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  checkProductExists,
} = require("../controllers/productController");

const { authMiddleware } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/multer");

router.get("/getAllProduct", getAllProducts);
router.get("/getProductById/:id", getProductById);
router.get("/exists/:id", checkProductExists);

router.post("/addProduct",authMiddleware("admin"), upload.single("image"), addProduct);
router.put("/updateProduct/:id", authMiddleware("admin"), upload.single("image"), updateProduct);
router.delete("/deleteProduct/:id", authMiddleware("admin"), deleteProduct);

module.exports = router;
