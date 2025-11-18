  const User = require("../models/userModel");
  const generateToken = require("../utils/generateToken");
  const sendEmail = require("../utils/sendEmail");
  const crypto = require("crypto");
  
const Order = require("../models/orderModel");

  // OTP generator
  const generateOTP = () => crypto.randomInt(100000, 999999).toString();

  // Request OTP
  const requestOTP = async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });

      let user = await User.findOne({ email });
      if (!user) user = await User.create({ email });

      const otp = generateOTP();
      const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      await user.save();

      // Send OTP via email
      try {
        await sendEmail(
          email,
          "Your OTP for Login",
          `Your OTP is: ${otp}. It is valid for 5 minutes.`
        );
      } catch (emailError) {
        return res.status(500).json({
          success: false,
          message: "Failed to send OTP email",
        });
      }

      return res.status(200).json({
        success: true,
        message: "OTP sent successfully to your email",
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  };

  const verifyOTP = async (req, res) => {
    try {
      const { email, otp } = req.body; // role body se mat lo

      if (!email || !otp)
        return res.status(400).json({ message: "Email and OTP are required" });

      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.otp !== otp || user.otpExpiry < Date.now())
        return res.status(400).json({ message: "Invalid or expired OTP" });

      if (!user.role) {
        user.role = "user"; 
      }

      // JWT generate
      const token = generateToken(user._id, user.email, user.role);

      // OTP clear
      user.otp = null;
      user.otpExpiry = null;
      await user.save();

      // Cookie set
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      const { _id, email: userEmail, role: userRole } = user;

      return res.status(200).json({
        success: true,
        message: "Login successful",
        user: { _id, email: userEmail, role: userRole },
        token,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  };

  const getAllUser = async (req, res) =>{
    try {
      const users = await User.find();
          res.status(200).json({ success: true, users});
      
    } catch (error) {
      res.status(500).json({ message: "Server error" , error})
    }
  }


  const logout = async (req, res) => {
    try {
      res.clearCookie("token", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      });

      return res.status(200).json({ message: "Logout successful" });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  };

  const getUserAddresses = async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // addresses array return
      res.status(200).json({ addresses: user.addresses || [] });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  };

const getAllCustomersWithStats = async (req, res) => {
  try {
    const customers = await User.aggregate([
      {
        $lookup: {
          from: "orders", // collection name in MongoDB
          localField: "_id",
          foreignField: "user",
          as: "orders",
        },
      },
      {
        $addFields: {
          totalOrders: { $size: "$orders" },
          totalSpent: { $sum: "$orders.totalAmount" },
          lastOrderDate: { $max: "$orders.createdAt" },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          phone: 1,
          createdAt: 1,
          totalOrders: 1,
          totalSpent: 1,
          lastOrderDate: 1,
          status: { $ifNull: ["$status", "Active"] },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.status(200).json({
      success: true,
      totalCustomers: customers.length,
      customers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};


const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP via email
    try {
      await sendEmail(
        email,
        "Your OTP for Login",
        `Your OTP is: ${otp}. It is valid for 5 minutes.`
      );
    } catch (emailError) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully to your email",
    });
  } catch (error) {
    console.error("Resend OTP error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};



  module.exports = { requestOTP, verifyOTP, logout, getAllUser, getUserAddresses ,getAllCustomersWithStats, resendOTP };
