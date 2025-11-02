"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Button, Typography } from "@mui/material";
import useProductStore from "../../store/ProductSlice";
import ProductCard from "../components/Product";

import useCartStore from "../../store/CartSlice"

export default function ProductDetailPage() {
  const { addToCart, error } = useCartStore()
  const { id } = useParams();
  const { getProductById, products } = useProductStore(); // products = all fetched products
  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);

  
  const handleAddToCart = async (e) => {
    e.stopPropagation()
    try {
      await addToCart(product._id, 1, selectedSize?.size)
      alert(`✅ ${product.name} (Size: ${selectedSize?.size || "N/A"}) added to cart!`)
    } catch {
      alert(`❌ ${error || "Failed to add product"}`)
    }
  }

  useEffect(() => {
    if (id) {
      getProductById(id).then((data) => {
        const productData = data?.product || data;

        // Set first available size
        if (productData.sizes && productData.sizes.length > 0) {
          const firstAvailable = productData.sizes.find((s) => s.stock > 0) || productData.sizes[0];
          setSelectedSize(firstAvailable);
        }

        setProduct(productData);
      });
    }
  }, [id, getProductById]);

  // ✅ Similar products: same category, exclude current, max 6
  const similarProducts = useMemo(() => {
    if (!product || !products) return [];
    return products
      .filter((p) => p._id !== product._id && p.category === product.category)
      .slice(0, 5);
  }, [product, products]);

  const isSizeSelectable = (sizeObj) => sizeObj?.stock > 0;

  if (!product)
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <p className="text-gray-500 text-lg">Loading product details...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 mt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* ===== Image Section ===== */}
        <div className="lg:col-span-7 rounded-2xl overflow-hidden bg-gray-100 shadow-md flex items-center justify-center">
          <img
            src={product.image || "https://via.placeholder.com/400x400.png?text=No+Image"}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* ===== Product Details ===== */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <h1 className="text-3xl font-semibold text-gray-900 leading-snug">{product.name}</h1>

          <div className="text-gray-500 text-sm">
            <p>
              <span className="font-medium text-gray-700">Brand:</span> {product.brand}
            </p>
            <p>
              <span className="font-medium text-gray-700">Category:</span> {product.category} → {product.subcategory}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-green-600">₹ {product.price}</span>
          </div>

          {/* ===== Size Selection ===== */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Size:</span>
                <span>{selectedSize?.size}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((sizeObj) => (
                  <Button
                    key={sizeObj.size}
                    variant={selectedSize?.size === sizeObj.size ? "contained" : "outlined"}
                    color={isSizeSelectable(sizeObj) ? "success" : "inherit"}
                    size="small"
                    disabled={!isSizeSelectable(sizeObj)}
                    onClick={() => setSelectedSize(sizeObj)}
                    className={`text-sm px-4 py-2 rounded-lg ${!isSizeSelectable(sizeObj) ? "line-through text-gray-400" : ""}`}
                  >
                    {sizeObj.size}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* ===== Stock & Status ===== */}
          <div className="flex flex-col gap-1">
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${product.status === "Active"
                  ? "bg-green-100 text-green-700"
                  : product.status === "Limited"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
            >
              {product.status}
            </span>
            {product.status === "Limited" && (
              <p className="text-gray-500 text-sm">
                Only few left in stock! ({selectedSize?.stock || 0} available for this size)
              </p>
            )}
          </div>

          {/* ===== Add to Cart Button ===== */}
          <div className="flex gap-4 pt-2">
            <Button
              variant="outlined"
              color="success"
              fullWidth
              className="py-2 rounded-lg text-lg font-medium"
              disabled={!isSizeSelectable(selectedSize)}
               onClick={handleAddToCart}
            >
              Add to Cart
            </Button>
          </div>

          {/* ===== Description ===== */}
          <div className="pt-5 border-t border-gray-200">
            <p className="font-semibold text-gray-900 mb-2">Description:</p>
            <p className="text-gray-600 leading-relaxed text-sm">{product.description || "No description available."}</p>
          </div>
        </div>
      </div>

      {/* ===== Similar Products ===== */}
      <div className="pt-20">
        <Typography
          variant="h5"
          className="!mb-6 !font-semibold text-gray-900 border-b border-gray-200 !pb-2"
        >
          Similar Products
        </Typography>

        {similarProducts.length > 0 ? (
          <div
            className="
        grid 
        grid-cols-2 
        sm:grid-cols-3 
        md:grid-cols-4 
        lg:grid-cols-5 
        gap-6
      "
          >
            {similarProducts.map((p) => (
              <div
                key={p._id || p.id}
                className="
            bg-white 
            border 
            border-gray-100 
            rounded-2xl 
            shadow-sm 
            hover:shadow-md 
            transition-all 
            duration-300 
            p-2
            flex 
            flex-col 
            items-center
          "
              >
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center mt-4">
            No similar products found.
          </p>
        )}
      </div>

    </div>
  );
}
