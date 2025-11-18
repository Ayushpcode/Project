const express = require("express");
const router = express.Router();
const  {createOrder , verifyPayment, createOrderInDB, checkWelcomeDiscount}  = require("../controllers/paymentController");
const { authMiddleware } = require("../middlewares/authMiddleware");

// ✅ Authenticated routes
router.post("/create-order", authMiddleware(), createOrder);
router.post("/verify-payment", authMiddleware(), verifyPayment);
router.post("/create-order-db", authMiddleware(), createOrderInDB); 
router.get("/check-discount", authMiddleware(), checkWelcomeDiscount); 

module.exports = router;
