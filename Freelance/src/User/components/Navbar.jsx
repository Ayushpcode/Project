import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Button,
  Menu,
  MenuItem,
  Avatar,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
  TextField,
} from "@mui/material";
import AccountCircle from "@mui/icons-material/Person";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { Link, useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/UserSlice";
import useCartStore from "../../store/CartSlice";
import SearchBar from "./Searchbar";
import { FaWhatsapp } from "react-icons/fa";

export default function UrbanMonkeyHeader() {
  const [profileAnchor, setProfileAnchor] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartStep, setCartStep] = useState("cart"); // cart, review, address, payment
  const [newAddress, setNewAddress] = useState({
    fullName: "",
    phoneNumber: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    paymentMethod: "cod",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const {
    user,
    isAuthenticated,
    logout,
    shippingAddresses = [],
    getAddresses,
    saveAddress,
    selectShippingAddress,
    selectedShippingAddressId,
    saveShippingAddress,
    placeCODOrder,
    setSelectedAddress,
    initiateRazorpayPayment
  } = useUserStore();

  const { cartItems = [], fetchCart, updateCart, removeFromCart, clearCart } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
    if (isAuthenticated) getAddresses();
  }, [fetchCart, isAuthenticated, getAddresses]);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      updateCart(productId, newQuantity);
    }
  };

  // ✅ Validation
  const validateAddress = () => {
    const newErrors = {};
    if (!newAddress.fullName || newAddress.fullName.trim().length < 3)
      newErrors.fullName = "Full Name must be at least 3 characters";
    if (!/^[0-9]{10}$/.test(newAddress.phoneNumber || ""))
      newErrors.phoneNumber = "Phone number must be 10 digits";
    if (!newAddress.line1) newErrors.line1 = "Address Line 1 is required";
    if (!newAddress.city) newErrors.city = "City is required";
    if (!newAddress.state) newErrors.state = "State is required";
    if (!/^[0-9]{6}$/.test(newAddress.postalCode || ""))
      newErrors.postalCode = "Postal code must be 6 digits";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveNewAddress = async () => {
    if (!validateAddress()) return;

    try {
      setLoading(true);
      // add id for local store (if your saveAddress expects id)
      const addrId = Date.now().toString();
      const addrToSave = { ...newAddress, id: addrId };

      // 1) save locally in Zustand
      if (typeof saveAddress === "function") {
        await saveAddress(addrToSave);
      }

      // 2) send address to backend to attach to pending order
      if (typeof saveShippingAddress === "function") {
        // Some implementations expect just the address object
        await saveShippingAddress({
          fullName: addrToSave.fullName,
          phoneNumber: addrToSave.phoneNumber,
          line1: addrToSave.line1,
          line2: addrToSave.line2,
          city: addrToSave.city,
          state: addrToSave.state,
          postalCode: addrToSave.postalCode,
        });
      }

      // 3) select it locally
      if (typeof selectShippingAddress === "function") {
        selectShippingAddress(addrId);
      }

      setNewAddress({
        fullName: "",
        phoneNumber: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        postalCode: "",
        paymentMethod: "cod",
      });
      setErrors({});
      setCartStep("review");
      // refresh cart just in case
      fetchCart();
    } catch (err) {
      console.error("Save address failed:", err);
      alert(err?.message || "Failed to save address");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAddress = async (addr) => {
    try {
      console.log("🟩 Selected Address Object:", addr);
      setSelectedAddress(addr);
      setLoading(true);
      if (typeof selectShippingAddress === "function") {
        console.log("📦 Saving selected address ID:", addr.id);
        selectShippingAddress(addr.id);
      }

      if (typeof saveShippingAddress === "function") {
        console.log("🌐 Sending address data to backend:", {
          fullName: addr.fullName,
          phoneNumber: addr.phoneNumber,
          line1: addr.line1,
          line2: addr.line2,
          city: addr.city,
          state: addr.state,
          postalCode: addr.postalCode,
        });

        await saveShippingAddress({
          fullName: addr.fullName,
          phoneNumber: addr.phoneNumber,
          line1: addr.line1,
          line2: addr.line2,
          city: addr.city,
          state: addr.state,
          postalCode: addr.postalCode,
        });
      }

      setCartStep("payment");
    } catch (err) {
      console.error("Select address failed:", err);
      alert(err?.message || "Failed to select address");
    } finally {
      setLoading(false);
    }
  };

  // Final order placement (calls Zustand backend function)
  const handlePlaceOrder = async () => {
    // ensure address selected
    if (!selectedShippingAddressId) {
      alert("Please select a shipping address");
      return;
    }

    // ensure cart not empty
    if (!cartItems || cartItems.length === 0) {
      alert("Your cart is empty");
      return;
    }

    try {
      setLoading(true);

      // call zustand's placeCODOrder, which should call backend and create new order based on server-side cart
      if (typeof placeCODOrder !== "function") {
        throw new Error("placeCODOrder not implemented in store");
      }

      const resp = await placeCODOrder(); // store handles auth token and backend call

      // success
      console.log("Order placed response:", resp);
      alert("Order placed successfully!");

      // clear frontend cart state if clearCart available, otherwise fetchCart to refresh
      if (typeof clearCart === "function") {
        await clearCart();
      } else {
        // fallback: refetch cart
        await fetchCart();
      }

      // reset drawer and step
      setIsCartOpen(false);
      setCartStep("cart");
    } catch (err) {
      console.error("Place order error:", err);
      alert(err?.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Order logic
  const handleNext = async () => {
    if (cartStep === "cart") {
      setCartStep("review");
    } else if (cartStep === "review") {
      setCartStep("payment");
    } else if (cartStep === "payment") {
      try {
        if (!newAddress.paymentMethod) {
          alert("Please select a payment method");
          return;
        }

        const totalAmount = cartItems.reduce(
          (sum, item) => sum + item.productId.price * item.quantity,
          0
        );

        let finalAmount = totalAmount;
        if (isAuthenticated && !user.hasOrdered) {
          finalAmount = Math.round(totalAmount * 0.95);
        }

        if (newAddress.paymentMethod === "cod") {
          alert(
            `🎉 Congratulations! Your COD order has been placed successfully!\nTotal: ₹${finalAmount}`
          );
        } else if (newAddress.paymentMethod === "online") {
          alert(
            `Redirecting to online payment gateway...\nTotal: ₹${finalAmount}`
          );
        }

        if (isAuthenticated && !user.hasOrdered) {
          user.hasOrdered = true;
        }

        setIsCartOpen(false);
        setCartStep("cart");
      } catch (err) {
        alert("Failed to place order: " + err.message);
      }
    }
  };

  const handleBack = () => {
    if (cartStep === "payment") setCartStep("review");
    else if (cartStep === "review") setCartStep("cart");
    else if (cartStep === "address") setCartStep("review");
  };

  // ✅ WhatsApp Join Group Handler
  const handleJoinWhatsApp = () => {
    const groupLink = "https://chat.whatsapp.com/YourGroupInviteLinkHere"; // 🟢 Replace this with your group link

    const userConfirmed = window.confirm(
      "📱 Do you want to open WhatsApp and join our community group?\n\nYou'll need to grant permission to open WhatsApp."
    );

    if (userConfirmed) {
      // Animate alert before opening
      const popup = document.createElement("div");
      popup.innerText = "Opening WhatsApp...";
      popup.style.position = "fixed";
      popup.style.bottom = "20px";
      popup.style.right = "20px";
      popup.style.background = "#25D366";
      popup.style.color = "white";
      popup.style.padding = "12px 20px";
      popup.style.borderRadius = "12px";
      popup.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
      popup.style.fontWeight = "bold";
      popup.style.transition = "opacity 0.5s ease";
      document.body.appendChild(popup);

      setTimeout(() => {
        popup.style.opacity = "0";
        setTimeout(() => popup.remove(), 500);
        window.open(groupLink, "_blank");
      }, 1200);
    }
  };

  return (
    <header>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: "1px solid #e5e7eb" }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-around" }}>
          <div className="flex gap-10 items-center px-2">
            <Link to="/">
              <Typography
                variant="h4"
                noWrap
                sx={{ fontWeight: "bold", color: "black" }}
              >
                URBAN MONKEY®
              </Typography>
            </Link>
            <SearchBar />
          </div>

          <div className="flex gap-5 w-[180px] justify-between">
            {!isAuthenticated ? (
              <IconButton color="inherit" component={Link} to="/auth">
                <AccountCircle />
              </IconButton>
            ) : (
              <>
                <IconButton
                  color="inherit"
                  onClick={(e) => setProfileAnchor(e.currentTarget)}
                >
                  <Avatar
                    src={user?.avatar || "https://i.pravatar.cc/40"}
                    alt={user?.name || "User"}
                  />
                </IconButton>
                <Menu
                  anchorEl={profileAnchor}
                  open={Boolean(profileAnchor)}
                  onClose={() => setProfileAnchor(null)}
                  PaperProps={{
                    elevation: 4,
                    sx: {
                      mt: 1.5,
                      borderRadius: 3,
                      minWidth: 180,
                      background: "rgba(255, 255, 255, 0.8)",
                      backdropFilter: "blur(10px)",
                      boxShadow: "0px 4px 20px rgba(0,0,0,0.15)",
                      "& .MuiMenuItem-root": {
                        fontWeight: 500,
                        borderRadius: 2,
                        mx: 1,
                        my: 0.5,
                        transition: "all 0.2s ease",
                      },
                      "& .MuiMenuItem-root:hover": {
                        backgroundColor: "rgba(0,0,0,0.05)",
                        transform: "scale(1.02)",
                      },
                    },
                  }}
                  transformOrigin={{ horizontal: "right", vertical: "top" }}
                  anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                >
                  <MenuItem
                    onClick={() => {
                      navigate("/");
                      setProfileAnchor(null);
                    }}
                  >
                    🏠 Home
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      navigate("/profile");
                      setProfileAnchor(null);
                    }}
                  >
                    👤 Profile
                  </MenuItem>

                  <MenuItem
                    onClick={() => {
                      navigate("/orders");
                      setProfileAnchor(null);
                    }}
                  >
                    📦 My Orders
                  </MenuItem>

                  <Divider sx={{ my: 0.5 }} />

                  <MenuItem
                    onClick={() => {
                      logout();
                      clearCart();
                      navigate("/auth");
                      setProfileAnchor(null);
                    }}
                    sx={{
                      color: "red",
                      fontWeight: 600,
                      "&:hover": {
                        backgroundColor: "rgba(255,0,0,0.05)",
                        color: "#b71c1c",
                      },
                    }}
                  >
                    🚪 Logout
                  </MenuItem>
                </Menu>
              </>
            )}

            {/* ✅ WhatsApp Icon Button */}
            <IconButton color="success" onClick={handleJoinWhatsApp}>
              <FaWhatsapp className="text-black text-3xl" />
            </IconButton>

            <IconButton color="inherit" onClick={() => setIsCartOpen(true)}>
              <Badge badgeContent={totalItems} color="error">
                <ShoppingCartIcon />
              </Badge>
            </IconButton>
          </div>
        </Toolbar>
      </AppBar>

      <Drawer anchor="right" open={isCartOpen} onClose={() => setIsCartOpen(false)}>
        <Box sx={{ width: 380, display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2, borderBottom: "1px solid #ddd" }}>
            <Typography variant="h6">
              {cartStep === "cart" ? `Shopping Cart (${totalItems})`
                : cartStep === "review" ? "Review Address"
                  : cartStep === "address" ? "Add New Address"
                    : "Payment Details"}
            </Typography>
            <IconButton onClick={() => setIsCartOpen(false)}><CloseIcon /></IconButton>
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
            {/* Cart Step */}
            {cartStep === "cart" && (
              cartItems.length === 0 ? (
                <Typography align="center" mt={4}>Your cart is empty</Typography>
              ) : (
                <List>
                  {cartItems.map((item, index) => (
                    <React.Fragment key={`${item.productId?._id || item.productId}-${item.size || index}`}>
                      <ListItem>
                        <img
                          src={item.productId?.image || ""}
                          alt={item.productId?.name || ""}
                          style={{ width: 60, height: 60, marginRight: 12, borderRadius: 8 }}
                        />
                        <ListItemText
                          primary={item.productId?.name || ""}
                          secondary={
                            <>
                              <Typography component="span" variant="body2" color="text.primary">
                                ₹{item.productId?.price || ""}
                              </Typography>
                              <br />
                              <Typography
                                component="span"
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontSize: 13 }}
                              >
                                Size: <strong>{item.size || "N/A"}</strong>
                              </Typography>
                            </>
                          }
                        />
                        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                          <IconButton
                            onClick={() =>
                              updateQuantity(item.productId?._id, item.quantity - 1)
                            }
                          >
                            <RemoveIcon />
                          </IconButton>
                          <Typography>{item.quantity}</Typography>
                          <IconButton
                            onClick={() =>
                              updateQuantity(item.productId._id, item.quantity + 1)
                            }
                          >
                            <AddIcon />
                          </IconButton>
                        </Box>
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              )
            )}

            {/* Review Step */}
            {cartStep === "review" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  Choose Your Shipping Address
                </Typography>

                {shippingAddresses
                  ?.filter(
                    (addr) =>
                      addr &&
                      (addr.fullName?.trim() ||
                        addr.line1?.trim() ||
                        addr.city?.trim() ||
                        addr.phoneNumber?.trim())
                  ).length === 0 ? (
                  <Typography align="center" color="text.secondary">
                    No saved addresses found.
                  </Typography>
                ) : (
                  shippingAddresses
                    ?.filter(
                      (addr) =>
                        addr &&
                        (addr.fullName?.trim() ||
                          addr.line1?.trim() ||
                          addr.city?.trim() ||
                          addr.phoneNumber?.trim())
                    )
                    .map((addr, index) => {
                      const addrId = addr._id || addr.id || index;
                      const isSelected = selectedShippingAddressId === addrId;

                      return (
                        <Box
                          key={addrId}
                          onClick={() => handleSelectAddress(addr)}
                          sx={{
                            borderRadius: 3,
                            border: isSelected ? "2px solid black" : "1px solid #ddd",
                            p: 2,
                            cursor: "pointer",
                            transition: "0.2s",
                            "&:hover": { borderColor: "black" },
                          }}
                        >
                          <Typography variant="subtitle1">{addr.fullName}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {addr.line1}, {addr.city}, {addr.state} - {addr.postalCode}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            📞 {addr.phoneNumber}
                          </Typography>
                          {isSelected && (
                            <Typography variant="caption" color="green">
                              ✓ Selected
                            </Typography>
                          )}
                        </Box>
                      );
                    })
                )}
              </Box>
            )}

            {/* Add Address Step */}
            {cartStep === "address" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {["fullName", "phoneNumber", "line1", "line2", "city", "state", "postalCode"].map((field) => (
                  <TextField
                    key={field}
                    label={field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                    value={newAddress[field] || ""}
                    onChange={(e) => setNewAddress({ ...newAddress, [field]: e.target.value })}
                    error={Boolean(errors[field])}
                    helperText={errors[field] || ""}
                  />
                ))}
              </Box>
            )}

            {/* Payment Step */}
            {cartStep === "payment" && (() => {
              // Calculate amounts at the component level so they're available everywhere
              const totalAmount = cartItems.reduce(
                (sum, item) => sum + item.productId.price * item.quantity,
                0
              );
              const shippingCharge = 15;
              const deliveryCharge = 50;
              const discount = isAuthenticated && !user?.hasOrdered
                ? Math.round(totalAmount * 0.05)
                : 0;
              const beforeDiscountTotal = totalAmount + shippingCharge + deliveryCharge;
              const finalAmount = Math.round(beforeDiscountTotal - discount);

              return (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    p: 3,
                    mt: 2,
                  }}
                >
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: "bold",
                      textAlign: "center",
                      mb: 1,
                      color: "#222",
                    }}
                  >
                    Checkout Summary
                  </Typography>

                  <Box
                    sx={{
                      width: "100%",
                      maxWidth: 480,
                      p: 3,
                      borderRadius: 3,
                      boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
                      bgcolor: "white",
                    }}
                  >
                    {/* Price Breakdown */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography sx={{ color: "#555" }}>Subtotal</Typography>
                      <Typography sx={{ fontWeight: 500 }}>₹{totalAmount}</Typography>
                    </Box>

                    {discount > 0 && (
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                        <Typography sx={{ color: "#00796b" }}>Welcome Coupon (5% off)</Typography>
                        <Typography sx={{ color: "#00796b" }}>-₹{discount}</Typography>
                      </Box>
                    )}

                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography sx={{ color: "#555" }}>Shipping Charges</Typography>
                      <Typography sx={{ fontWeight: 500 }}>+₹{shippingCharge}</Typography>
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                      <Typography sx={{ color: "#555" }}>Delivery Charges</Typography>
                      <Typography sx={{ fontWeight: 500 }}>+₹{deliveryCharge}</Typography>
                    </Box>

                    {/* Divider */}
                    <Box sx={{ borderTop: "1px solid #ddd", my: 2 }}></Box>

                    {/* Total Payable */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            color: "#888",
                            fontSize: "0.9rem",
                            textDecoration: "line-through",
                          }}
                        >
                          ₹{beforeDiscountTotal}
                        </Typography>
                        <Typography
                          sx={{
                            fontWeight: "bold",
                            fontSize: "1.4rem",
                            color: "#2e7d32",
                          }}
                        >
                          ₹{finalAmount}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          fontSize: "1.1rem",
                          fontWeight: 600,
                          color: "#2e7d32",
                        }}
                      >
                        Total Payable
                      </Typography>
                    </Box>

                    {/* ✅ You Saved section */}
                    {discount > 0 && (
                      <Typography
                        sx={{
                          textAlign: "center",
                          mt: 2,
                          color: "#00897b",
                          fontWeight: 500,
                          fontSize: "0.95rem",
                        }}
                      >
                        🎉 You saved ₹{discount} on this order!
                      </Typography>
                    )}
                  </Box>

                  {/* Payment Buttons */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      gap: 2,
                      width: "100%",
                      maxWidth: 480,
                    }}
                  >
                    <Button
                      variant={newAddress.paymentMethod === "cod" ? "contained" : "outlined"}
                      fullWidth
                      color="success"
                      sx={{ py: 1.5, fontWeight: 600 }}
                      // onClick={async () => {
                      //   try {
                      //     const { cartItems } = useCartStore.getState();
                      //     const { placeCODOrder, selectedShippingAddressId, shippingAddresses } = useUserStore.getState();

                      //     // find the selected address object
                      //     const selectedAddr = shippingAddresses.find(a => a.id === selectedShippingAddressId);
                      //     if (!selectedAddr) {
                      //       alert("Please select a shipping address");
                      //       return;
                      //     }

                      //     if (newAddress.paymentMethod === "cod") {
                      //       await placeCODOrder({ items: cartItems, address: selectedAddr });
                      //       alert("✅ COD Order placed successfully!");
                      //       setIsCartOpen(false);
                      //     } else if (newAddress.paymentMethod === "online") {
                      //       console.log("💳 Redirecting to online payment...");
                      //     } else {
                      //       alert("Please select a payment method first!");
                      //     }
                      //   } catch (err) {
                      //     console.error("❌ Order failed:", err);
                      //   }
                      // }}
                      onClick={() =>
                        setNewAddress({ ...newAddress, paymentMethod: "cod" })
                      }
                    >
                      Cash Payment
                    </Button>

                    <Button
                      variant={newAddress.paymentMethod === "online" ? "contained" : "outlined"}
                      fullWidth
                      color="success"
                      // onClick={() => {
                      //   setNewAddress({ ...newAddress, paymentMethod: "online" });
                      //   initiateRazorpayPayment(finalAmount);
                      // }}
                      onClick={() =>
                        setNewAddress({ ...newAddress, paymentMethod: "online" })
                      }
                      sx={{ py: 1.5, fontWeight: 600 }}
                    >
                      Online Payment
                    </Button>
                  </Box>
                </Box>
              );
            })()}
          </Box>

          {/* Footer */}
          <Box sx={{ borderTop: "1px solid #ddd", p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
            {cartStep !== "cart" && <Button variant="outlined" fullWidth onClick={handleBack}>← Back</Button>}
            {cartStep === "cart" && cartItems.length > 0 &&
              <Button fullWidth variant="contained" sx={{ bgcolor: "black", "&:hover": { bgcolor: "#333" }, py: 1.2, fontWeight: "bold" }} onClick={handleNext}>Proceed to Review →</Button>}
            {cartStep === "review" && <>
              <Button fullWidth variant="outlined" onClick={() => setCartStep("address")}>+ Add New Address</Button>
              <Button fullWidth variant="contained" sx={{ bgcolor: "black", "&:hover": { bgcolor: "#333" }, py: 1.2, fontWeight: "bold" }}
                disabled={!selectedShippingAddressId} onClick={handleNext}>Continue to Payment →</Button>
            </>}
            {cartStep === "address" &&
              <Button fullWidth variant="contained" sx={{ bgcolor: "black", "&:hover": { bgcolor: "#333" }, py: 1.2, fontWeight: "bold" }} onClick={handleSaveNewAddress}>Save Address</Button>}
            {cartStep === "payment" &&
              <Button
                fullWidth variant="contained"
                sx={{ bgcolor: "black", "&:hover": { bgcolor: "#333" }, py: 1.5, fontWeight: "bold" }}
                onClick={async () => {
                  try {
                    const { cartItems } = useCartStore.getState();
                    const {
                      placeCODOrder,
                      selectedShippingAddressId,
                      shippingAddresses,
                    } = useUserStore.getState();

                    const selectedAddr = shippingAddresses.find(
                      (a) => a.id === selectedShippingAddressId
                    );

                    if (!selectedAddr) {
                      alert("Please select a shipping address");
                      return;
                    }

                    // ✅ Handle payment type
                    if (newAddress.paymentMethod === "cod") {
                      await placeCODOrder({ items: cartItems, address: selectedAddr });
                      alert("✅ COD Order placed successfully!");
                      setIsCartOpen(false);
                    } else if (newAddress.paymentMethod === "online") {
                      initiateRazorpayPayment(finalAmount);
                    } else {
                      alert("Please select a payment method first!");
                    }
                  } catch (err) {
                    console.error("❌ Order failed:", err);
                  }
                }}
              >

                Place Order
              </Button>}
          </Box>
        </Box>
      </Drawer>
    </header>
  );
}