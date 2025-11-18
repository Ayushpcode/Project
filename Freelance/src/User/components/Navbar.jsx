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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AccountCircle from "@mui/icons-material/Person";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import MenuIcon from "@mui/icons-material/Menu";
import { Link, useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/UserSlice";
import useCartStore from "../../store/CartSlice";
import SearchBar from "./Searchbar";
import { FaWhatsapp } from "react-icons/fa";

export default function UrbanMonkeyHeader() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  const [profileAnchor, setProfileAnchor] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartStep, setCartStep] = useState("cart");
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

  // ✅ ADD: State for discount eligibility
  const [discountInfo, setDiscountInfo] = useState({ isEligible: false, discountPercentage: 0 });

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
    initiateRazorpayPayment,
    checkWelcomeDiscount, // ✅ ADD: Import the new function
    fetchUserProfile, // ✅ ADD: To refresh user data
  } = useUserStore();

  const { cartItems = [], fetchCart, updateCart, removeFromCart, clearCart } = useCartStore();
  const navigate = useNavigate();

  // ✅ FIX: Check discount eligibility when cart opens or user changes
  useEffect(() => {
    const checkDiscount = async () => {
      if (isAuthenticated && isCartOpen) {
        try {
          const info = await checkWelcomeDiscount();
          setDiscountInfo(info);
        } catch (err) {
          console.error("Error checking discount:", err);
          setDiscountInfo({ isEligible: false, discountPercentage: 0 });
        }
      }
    };
    checkDiscount();
  }, [isAuthenticated, isCartOpen, checkWelcomeDiscount]);

  useEffect(() => {
    fetchCart();
    if (isAuthenticated) getAddresses();
  }, [fetchCart, isAuthenticated, getAddresses]);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const getCartItemImage = (item) => {
    const product = item?.productId || item?.product;
    if (!product) {
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='%23666'%3ENo Image%3C/text%3E%3C/svg%3E";
    }
    if (product.primaryImage?.url) return product.primaryImage.url;
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      const primary = product.images.find(img => img.isPrimary);
      if (primary?.url) return primary.url;
      if (product.images[0]?.url) return product.images[0].url;
    }
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='%23666'%3ENo Image%3C/text%3E%3C/svg%3E";
  };

  const validateCartStock = () => {
    for (const item of cartItems) {
      const product = item.productId || item.product;
      const sizeObj = product?.sizes?.find(s => s.size === item.size);
      if (!sizeObj) {
        return {
          valid: false,
          message: `Size ${item.size} not found for ${product?.name}`
        };
      }
      if (sizeObj.stock < item.quantity) {
        return {
          valid: false,
          message: `Insufficient stock for "${product?.name}" - Size ${item.size}.\nAvailable: ${sizeObj.stock}, In cart: ${item.quantity}`
        };
      }
    }
    return { valid: true };
  };

  const updateQuantity = (productId, size, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId, size);
    } else {
      updateCart(productId, newQuantity, size);
    }
  };

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
      const addrId = Date.now().toString();
      const addrToSave = { ...newAddress, id: addrId };
      if (typeof saveAddress === "function") {
        await saveAddress(addrToSave);
      }
      if (typeof saveShippingAddress === "function") {
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
      setSelectedAddress(addr);
      setLoading(true);
      if (typeof selectShippingAddress === "function") {
        selectShippingAddress(addr.id);
      }
      if (typeof saveShippingAddress === "function") {
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

  const handleNext = async () => {
    if (cartStep === "cart") {
      const stockCheck = validateCartStock();
      if (!stockCheck.valid) {
        alert(`⚠️ ${stockCheck.message}\n\nPlease update your cart quantities.`);
        return;
      }
      setCartStep("review");
    } else if (cartStep === "review") {
      setCartStep("payment");
    }
  };

  const handleBack = () => {
    if (cartStep === "payment") setCartStep("review");
    else if (cartStep === "review") setCartStep("cart");
    else if (cartStep === "address") setCartStep("review");
  };

  const handleJoinWhatsApp = () => {
    const groupLink = "https://chat.whatsapp.com/YourGroupInviteLinkHere";
    const userConfirmed = window.confirm(
      "📱 Do you want to open WhatsApp and join our community group?\n\nYou'll need to grant permission to open WhatsApp."
    );
    if (userConfirmed) {
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
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-around",
            px: { xs: 1, sm: 2, md: 10 },
            minHeight: { xs: 56, sm: 64 }
          }}
        >
          {/* Left Section - Logo & Search */}
          <Box sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 1, md: 10 },
            flex: 1,
            minWidth: 0,
            px: { xs: 0, md: 2 }
          }}>
            <Link to="/" style={{ textDecoration: 'none', minWidth: 0 }}>
              <Typography
                variant="h6"
                noWrap
                sx={{
                  fontWeight: "bold",
                  color: "black",
                  fontSize: { xs: '1.8rem', md: '2rem' }
                }}
              >
                DRIP NATION®
              </Typography>
            </Link>

            {/* Search bar - hidden on small screens */}
            {!isTablet && (
              <Box sx={{ flex: 1, maxWidth: 500, display: { xs: 'none', md: 'block' } }}>
                <SearchBar />
              </Box>
            )}
          </Box>

          {/* Right Section - Icons */}
          <Box sx={{
            display: "flex",
            gap: 5,
            alignItems: "center",
            width: { xs: 'auto', md: '180px' },
            justifyContent: 'flex'
          }}>
            {!isAuthenticated ? (
              <IconButton
                color="inherit"
                component={Link}
                to="/auth"
              >
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
                    sx={{ width: 36, height: 36 }}
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
                  <MenuItem onClick={() => { navigate("/"); setProfileAnchor(null); }}>
                    🏠 Home
                  </MenuItem>
                  <MenuItem onClick={() => { navigate("/profile"); setProfileAnchor(null); }}>
                    👤 Profile
                  </MenuItem>
                  <MenuItem onClick={() => { navigate("/orders"); setProfileAnchor(null); }}>
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

            <IconButton
              color="success"
              onClick={handleJoinWhatsApp}
            >
              <FaWhatsapp className="text-black text-3xl" />
            </IconButton>

            <IconButton
              color="inherit"
              onClick={() => setIsCartOpen(true)}
            >
              <Badge badgeContent={totalItems} color="error">
                <ShoppingCartIcon />
              </Badge>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Cart Drawer */}
      <Drawer
        anchor="right"
        open={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 420, md: 480 },
            maxWidth: '100vw'
          }
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Header */}
          <Box sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: { xs: 1.5, sm: 2 },
            borderBottom: "1px solid #ddd"
          }}>
            <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: 600 }}>
              {cartStep === "cart" ? `Cart (${totalItems})`
                : cartStep === "review" ? "Review"
                  : cartStep === "address" ? "New Address"
                    : "Payment"}
            </Typography>
            <IconButton onClick={() => setIsCartOpen(false)} size={isMobile ? "small" : "medium"}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 1.5, sm: 2 } }}>
            {/* Cart Step */}
            {cartStep === "cart" && (
              cartItems.length === 0 ? (
                <Typography align="center" mt={4}>Your cart is empty</Typography>
              ) : (
                <List>
                  {cartItems.map((item, index) => {
                    const product = item.productId || item.product;
                    const imageUrl = getCartItemImage(item);
                    const sizeObj = product?.sizes?.find(s => s.size === item.size);
                    const hasStockIssue = sizeObj && sizeObj.stock < item.quantity;

                    return (
                      <React.Fragment key={`${product?._id || index}-${item.size || 'nosize'}-${index}`}>
                        <ListItem sx={{
                          backgroundColor: hasStockIssue ? '#fff3e0' : 'transparent',
                          borderLeft: hasStockIssue ? '3px solid #ff9800' : 'none',
                          mb: 1,
                          borderRadius: 1,
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          gap: { xs: 1, sm: 0 },
                          py: { xs: 1.5, sm: 1 }
                        }}>
                          <Box sx={{ display: 'flex', gap: 1.5, width: { xs: '100%', sm: 'auto' } }}>
                            <img
                              src={imageUrl}
                              alt={product?.name || "Product"}
                              style={{
                                width: isMobile ? 50 : 60,
                                height: isMobile ? 50 : 60,
                                borderRadius: 8,
                                objectFit: "contain",
                                backgroundColor: "#f9f9f9",
                                border: "1px solid #eee"
                              }}
                              onError={(e) => {
                                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23fee'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='%23c00'%3EError%3C/text%3E%3C/svg%3E";
                              }}
                            />
                            <ListItemText
                              primary={
                                <Box>
                                  <Typography variant={isMobile ? "body2" : "body1"}>
                                    {product?.name || "Unknown Product"}
                                  </Typography>
                                  {hasStockIssue && (
                                    <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5, fontWeight: 'bold' }}>
                                      ⚠️ Only {sizeObj.stock} available
                                    </Typography>
                                  )}
                                </Box>
                              }
                              secondary={
                                <>
                                  <Typography component="span" variant="body2" color="text.primary">
                                    ₹{product?.price || "0"}
                                  </Typography>
                                  <br />
                                  <Typography component="span" variant="caption" color="text.secondary">
                                    Size: <strong>{item.size || "N/A"}</strong>
                                  </Typography>
                                </>
                              }
                            />
                          </Box>
                          <Box sx={{
                            display: "flex",
                            gap: { xs: 0.5, sm: 1 },
                            alignItems: "center",
                            ml: { xs: 0, sm: 'auto' },
                            alignSelf: { xs: 'flex-end', sm: 'center' }
                          }}>
                            <IconButton
                              size="small"
                              onClick={() => updateQuantity(product?._id, item.size, item.quantity - 1)}
                            >
                              <RemoveIcon fontSize="small" />
                            </IconButton>
                            <Typography sx={{
                              minWidth: 20,
                              textAlign: "center",
                              color: hasStockIssue ? '#ff9800' : 'inherit',
                              fontWeight: hasStockIssue ? 'bold' : 'normal',
                              fontSize: { xs: '0.875rem', sm: '1rem' }
                            }}>
                              {item.quantity}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => updateQuantity(product?._id, item.size, item.quantity + 1)}
                              disabled={sizeObj && item.quantity >= sizeObj.stock}
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    );
                  })}
                </List>
              )
            )}

            {/* Review Step */}
            {cartStep === "review" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: "bold" }}>
                  Choose Shipping Address
                </Typography>

                {shippingAddresses?.filter(addr => addr && (addr.fullName?.trim() || addr.line1?.trim())).length === 0 ? (
                  <Typography align="center" color="text.secondary">
                    No saved addresses found.
                  </Typography>
                ) : (
                  shippingAddresses
                    ?.filter(addr => addr && (addr.fullName?.trim() || addr.line1?.trim()))
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
                            p: { xs: 1.5, sm: 2 },
                            cursor: "pointer",
                            transition: "0.2s",
                            "&:hover": { borderColor: "black" },
                          }}
                        >
                          <Typography variant={isMobile ? "body2" : "subtitle1"} sx={{ fontWeight: 600 }}>
                            {addr.fullName}
                          </Typography>
                          <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">
                            {addr.line1}, {addr.city}, {addr.state} - {addr.postalCode}
                          </Typography>
                          <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">
                            📞 {addr.phoneNumber}
                          </Typography>
                          {isSelected && (
                            <Typography variant="caption" color="green" sx={{ fontWeight: 600 }}>
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
              <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 1.5, sm: 2 } }}>
                {["fullName", "phoneNumber", "line1", "line2", "city", "state", "postalCode"].map((field) => (
                  <TextField
                    key={field}
                    label={field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                    value={newAddress[field] || ""}
                    onChange={(e) => setNewAddress({ ...newAddress, [field]: e.target.value })}
                    error={Boolean(errors[field])}
                    helperText={errors[field] || ""}
                    size={isMobile ? "small" : "medium"}
                    fullWidth
                  />
                ))}
              </Box>
            )}

            {/* Payment Step */}
            {cartStep === "payment" && (() => {
              const totalAmount = cartItems.reduce((sum, item) => sum + item.productId.price * item.quantity, 0);
              const shippingCharge = 15;
              const deliveryCharge = 50;

              // ✅ FIX: Use discountInfo from state instead of user.hasOrdered
              const discount = discountInfo.isEligible ? Math.round(totalAmount * (discountInfo.discountPercentage / 100)) : 0;
              const beforeDiscountTotal = totalAmount + shippingCharge + deliveryCharge;
              const finalAmount = Math.round(beforeDiscountTotal - discount);

              return (
                <Box sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: { xs: 2, sm: 3 },
                  p: { xs: 1, sm: 2 },
                }}>
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    sx={{ fontWeight: "bold", textAlign: "center", color: "#222" }}
                  >
                    Checkout Summary
                  </Typography>

                  <Box sx={{
                    width: "100%",
                    p: { xs: 2, sm: 3 },
                    borderRadius: 3,
                    boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
                    bgcolor: "white",
                  }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography sx={{ color: "#555", fontSize: { xs: '0.875rem', sm: '1rem' } }}>Subtotal</Typography>
                      <Typography sx={{ fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>₹{totalAmount}</Typography>
                    </Box>

                    {discount > 0 && (
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                        <Typography sx={{ color: "#00796b", fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                          Welcome Coupon ({discountInfo.discountPercentage}%)
                        </Typography>
                        <Typography sx={{ color: "#00796b", fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                          -₹{discount}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography sx={{ color: "#555", fontSize: { xs: '0.875rem', sm: '1rem' } }}>Shipping</Typography>
                      <Typography sx={{ fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>+₹{shippingCharge}</Typography>
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                      <Typography sx={{ color: "#555", fontSize: { xs: '0.875rem', sm: '1rem' } }}>Delivery</Typography>
                      <Typography sx={{ fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>+₹{deliveryCharge}</Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Box>
                        {discount > 0 && (
                          <Typography sx={{
                            color: "#888",
                            fontSize: { xs: '0.75rem', sm: '0.9rem' },
                            textDecoration: "line-through",
                          }}>
                            ₹{beforeDiscountTotal}
                          </Typography>
                        )}
                        <Typography sx={{
                          fontWeight: "bold",
                          fontSize: { xs: '1.25rem', sm: '1.4rem' },
                          color: "#2e7d32",
                        }}>
                          ₹{finalAmount}
                        </Typography>
                      </Box>
                      <Typography sx={{
                        fontSize: { xs: '0.875rem', sm: '1.1rem' },
                        fontWeight: 600,
                        color: "#2e7d32",
                      }}>
                        Total
                      </Typography>
                    </Box>

                    {discount > 0 && (
                      <Typography sx={{
                        textAlign: "center",
                        mt: 2,
                        color: "#00897b",
                        fontWeight: 500,
                        fontSize: { xs: '0.8rem', sm: '0.95rem' },
                      }}>
                        🎉 You saved ₹{discount}!
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: { xs: 1.5, sm: 2 },
                    width: "100%",
                  }}>
                    <Button
                      variant={newAddress.paymentMethod === "cod" ? "contained" : "outlined"}
                      fullWidth
                      color="success"
                      size={isMobile ? "medium" : "large"}
                      sx={{ py: { xs: 1, sm: 1.5 }, fontWeight: 600 }}
                      onClick={() => setNewAddress({ ...newAddress, paymentMethod: "cod" })}
                    >
                      Cash Payment
                    </Button>

                    <Button
                      variant={newAddress.paymentMethod === "online" ? "contained" : "outlined"}
                      fullWidth
                      color="success"
                      size={isMobile ? "medium" : "large"}
                      onClick={() => setNewAddress({ ...newAddress, paymentMethod: "online" })}
                      sx={{ py: { xs: 1, sm: 1.5 }, fontWeight: 600 }}
                    >
                      Online Payment
                    </Button>
                  </Box>
                </Box>
              );
            })()}
          </Box>

          {/* Footer */}
          <Box sx={{
            borderTop: "1px solid #ddd",
            p: { xs: 1.5, sm: 2 },
            display: "flex",
            flexDirection: "column",
            gap: 1
          }}>
            {cartStep !== "cart" && (
              <Button
                variant="outlined"
                fullWidth
                onClick={handleBack}
                size={isMobile ? "medium" : "large"}
              >
                ← Back
              </Button>
            )}

            {cartStep === "cart" && cartItems.length > 0 && (
              <Button
                fullWidth
                variant="contained"
                size={isMobile ? "medium" : "large"}
                sx={{
                  bgcolor: "black",
                  "&:hover": { bgcolor: "#333" },
                  py: { xs: 1, sm: 1.2 },
                  fontWeight: "bold"
                }}
                onClick={handleNext}
              >
                Proceed to Review →
              </Button>
            )}

            {cartStep === "review" && (
              <>
                <Button
                  fullWidth
                  variant="outlined"
                  size={isMobile ? "medium" : "large"}
                  onClick={() => setCartStep("address")}
                >
                  + Add New Address
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  size={isMobile ? "medium" : "large"}
                  sx={{
                    bgcolor: "black",
                    "&:hover": { bgcolor: "#333" },
                    py: { xs: 1, sm: 1.2 },
                    fontWeight: "bold"
                  }}
                  disabled={!selectedShippingAddressId}
                  onClick={handleNext}
                >
                  Continue to Payment →
                </Button>
              </>
            )}

            {cartStep === "address" && (
              <Button
                fullWidth
                variant="contained"
                size={isMobile ? "medium" : "large"}
                sx={{
                  bgcolor: "black",
                  "&:hover": { bgcolor: "#333" },
                  py: { xs: 1, sm: 1.2 },
                  fontWeight: "bold"
                }}
                onClick={handleSaveNewAddress}
              >
                Save Address
              </Button>
            )}

            {cartStep === "payment" && (
              <Button
                fullWidth
                variant="contained"
                size={isMobile ? "medium" : "large"}
                sx={{
                  bgcolor: "black",
                  "&:hover": { bgcolor: "#333" },
                  py: { xs: 1.2, sm: 1.5 },
                  fontWeight: "bold"
                }}
                onClick={async () => {
                  try {
                    const stockCheck = validateCartStock();
                    if (!stockCheck.valid) {
                      alert(`⚠️ ${stockCheck.message}\n\nPlease go back and update your cart.`);
                      return;
                    }

                    const { cartItems } = useCartStore.getState();
                    const {
                      placeCODOrder,
                      selectedShippingAddressId,
                      shippingAddresses,
                    } = useUserStore.getState();

                    const selectedAddr = shippingAddresses.find(
                      (a) => a.id === selectedShippingAddressId || a._id === selectedShippingAddressId
                    );

                    if (!selectedAddr) {
                      alert("Please select a shipping address");
                      return;
                    }

                    if (!newAddress.paymentMethod) {
                      alert("Please select a payment method!");
                      return;
                    }

                    setLoading(true);

                    if (newAddress.paymentMethod === "cod") {
                      await placeCODOrder({ items: cartItems, address: selectedAddr });

                      // ✅ FIX: Refresh discount info immediately after order
                      const updatedDiscountInfo = await checkWelcomeDiscount();
                      setDiscountInfo(updatedDiscountInfo);

                      alert("✅ COD Order placed successfully!");
                      await fetchCart();
                      setIsCartOpen(false);
                      setCartStep("cart");
                      navigate("/orders");

                    } else if (newAddress.paymentMethod === "online") {
                      const totalAmount = cartItems.reduce(
                        (sum, item) => sum + item.productId.price * item.quantity,
                        0
                      );
                      const shippingCharge = 15;
                      const deliveryCharge = 50;

                      const discount = discountInfo.isEligible
                        ? Math.round(totalAmount * (discountInfo.discountPercentage / 100))
                        : 0;
                      const finalAmount = Math.round(
                        totalAmount + shippingCharge + deliveryCharge - discount
                      );

                      // ✅ IMPORTANT: Wait for payment to complete
                      await initiateRazorpayPayment(finalAmount, cartItems, selectedAddr);

                      // ✅ FIX: Refresh discount info after successful payment
                      const updatedDiscountInfo = await checkWelcomeDiscount();
                      setDiscountInfo(updatedDiscountInfo);

                      await fetchCart();
                      setIsCartOpen(false);
                      setCartStep("cart");
                    }
                  } catch (err) {
                    console.error("❌ Order failed:", err);
                    alert(`❌ Order failed: ${err.message || "Something went wrong"}`);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                {loading ? "Processing..." : "Place Order"}
              </Button>
            )}
          </Box>
        </Box>
      </Drawer>
    </header>
  );
}