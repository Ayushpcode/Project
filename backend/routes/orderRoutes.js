const express = require("express");
const router = express.Router();
const { saveShippingAddress, placeCODOrder, getAllUserOrders } = require("../controllers/orderController");
const { authMiddleware } = require("../middlewares/authMiddleware");

// POST /api/orders/address
router.post("/shippingAddress", authMiddleware(), saveShippingAddress);

router.post("/cod", authMiddleware(), placeCODOrder);
router.get("/my-orders", authMiddleware(), getAllUserOrders );

module.exports = router;
