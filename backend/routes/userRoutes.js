const express = require("express");
const { requestOTP, verifyOTP, logout , getAllUser, getUserAddresses, getAllCustomersWithStats, resendOTP } = require("../controllers/userController");
const { addAddress, getAddresses, deleteAddress } = require("../controllers/addressController");
const { authMiddleware } = require("../middlewares/authMiddleware");

const router = express.Router();

// Step 1: Request OTP
router.post("/request-otp", requestOTP);

// Step 2: Verify OTP and login
router.post("/verify-otp", verifyOTP);

router.post("/logout", logout);

router.post("/resend-otp", resendOTP);

router.get("/stats", getAllCustomersWithStats);


router.get("/getAllUser", getAllUser);

router.get("/getAddresses", authMiddleware(), getUserAddresses);

router.post("/saveAddress", authMiddleware(), addAddress);

// router.get("/address", authMiddleware, getAddresses);

router.delete("/address/:addressId", authMiddleware(), deleteAddress);


module.exports = router;
