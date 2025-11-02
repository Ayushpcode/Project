"use client";
import React, { useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  CircularProgress,
} from "@mui/material";
import {useUserStore} from "../../store/UserSlice"; // ✅ Zustand store import

export default function OrderPage() {
  const { orders, loading, error, fetchUserOrders } = useUserStore();

  // 🔹 Fetch orders on mount
  useEffect(() => {
    fetchUserOrders();
  }, [fetchUserOrders]);

  return (
    <Box className="min-h-screen bg-gray-50 p-8 mt-20">
      <Box className="max-w-7xl mx-auto">
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", mb: 4, letterSpacing: 0.5 }}
        >
          My Orders
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography align="center" color="error">
            {error}
          </Typography>
        ) : orders.length === 0 ? (
          <Typography align="center" color="text.secondary">
            You have no orders yet.
          </Typography>
        ) : (
          <Paper
            elevation={0}
            sx={{
              border: "1px solid #e0e0e0",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f9f9f9" }}>
                    <TableCell sx={{ fontWeight: "bold" }}>Order ID</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Address</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Product Details
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Qty</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Size</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Price</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                    <TableCell
                      sx={{ fontWeight: "bold", textAlign: "right" }}
                    >
                      Total
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {orders.map((order) =>
                    order.items.map((product, idx) => (
                      <TableRow key={`${order._id}-${idx}`} hover>
                        {idx === 0 && (
                          <>
                            <TableCell rowSpan={order.items.length}>
                              {order.customOrderId }
                            </TableCell>
                            <TableCell rowSpan={order.items.length}>
                              {new Date(order.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell
                              rowSpan={order.items.length}
                              sx={{ whiteSpace: "pre-wrap" }}
                            >
                              {order.shippingAddress
                                ? `${order.shippingAddress.line1}, ${order.shippingAddress.city}`
                                : "N/A"}
                            </TableCell>
                          </>
                        )}

                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.quantity}</TableCell>
                        <TableCell>{product.size || "-"}</TableCell>
                        <TableCell>₹{product.price}</TableCell>

                        {idx === 0 && (
                          <>
                            <TableCell rowSpan={order.items.length}>
                              <Chip
                                label={order.status}
                                size="small"
                                sx={{
                                  backgroundColor:
                                    order.status === "delivered"
                                      ? "#e8f5e9"
                                      : order.status === "pending"
                                      ? "#fff8e1"
                                      : "#ffebee",
                                  color:
                                    order.status === "delivered"
                                      ? "#2e7d32"
                                      : order.status === "pending"
                                      ? "#f9a825"
                                      : "#c62828",
                                  fontWeight: "bold",
                                }}
                              />
                            </TableCell>
                            <TableCell
                              rowSpan={order.items.length}
                              sx={{ textAlign: "right", fontWeight: "bold" }}
                            >
                              ₹{order.totalPrice}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Divider />
          </Paper>
        )}
      </Box>
    </Box>
  );
}
