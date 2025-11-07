"use client";

import React, { useState, useEffect, useRef } from "react";
import { Edit2, Trash2, Plus, Upload, Search, X } from "lucide-react";
import useProductStore from "../../store/ProductSlice";
import toast, { Toaster } from "react-hot-toast";

export function ProductManagement() {
  const { products, fetchProducts, addProduct, updateProduct, deleteProduct, loading } =
    useProductStore();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const formRef = useRef(null);

  // ✅ Dynamic Categories
  const [categories, setCategories] = useState(["Jersey", "Boots"]);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "Jersey",
    subcategory: "",
    brand: "",
    description: "",
    image: "",
    sizes: [],
    status: "Active",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // ✅ Add new category
  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
      setFormData({ ...formData, category: newCategory.trim() });
      setNewCategory("");
      setShowCategoryInput(false);
      toast.success("Category added!");
    }
  };

  const handleAddProduct = async () => {
    if (
      !formData.name?.trim() ||
      !formData.price ||
      !formData.category?.trim() ||
      !formData.subcategory?.trim() ||
      !formData.brand?.trim() ||
      !formData.description?.trim() ||
      !formData.sizes ||
      formData.sizes.length === 0 ||
      formData.sizes.some((s) => !s.size?.trim() || s.stock === undefined)
    ) {
      toast.error("Please fill all required fields and sizes with stock");
      return;
    }

    try {
      const totalStock = formData.sizes.reduce((acc, s) => acc + Number(s.stock || 0), 0);
      const status = totalStock === 0 ? "Out of Stock" : totalStock <= 10 ? "Limited" : "Active";

      const productData = new FormData();
      productData.append('name', formData.name.trim());
      productData.append('price', formData.price);
      productData.append('category', formData.category.trim().toLowerCase());
      productData.append('subcategory', formData.subcategory.trim());
      productData.append('brand', formData.brand.trim());
      productData.append('description', formData.description.trim());
      productData.append('status', status);
      
      productData.append('sizes', JSON.stringify(
        formData.sizes.map(s => ({
          size: s.size,
          stock: Number(s.stock)
        }))
      ));

      if (formData.image instanceof File) {
        productData.append('image', formData.image);
      } else if (typeof formData.image === 'string' && formData.image.trim()) {
        productData.append('image', formData.image);
      }

      console.log('📤 Sending product data');

      if (editingId) {
        await updateProduct(editingId, productData);
      } else {
        await addProduct(productData);
      }

      toast.success(editingId ? "Product updated!" : "Product added!");

      setFormData({
        name: "",
        price: "",
        category: categories[0] || "Jersey",
        subcategory: "",
        brand: "",
        description: "",
        image: "",
        sizes: [],
        status: "Active",
      });
      setPreview(null);
      setShowForm(false);
      setEditingId(null);
      
      await fetchProducts();
      
    } catch (err) {
      console.error('Error saving product:', err);
      toast.error(err.message || "Failed to save product");
    }
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      price: product.price,
      category: product.category,
      subcategory: product.subcategory,
      brand: product.brand,
      description: product.description,
      image: product.image || "",
      sizes: product.sizes.map((s) => ({ ...s, id: s.id || Date.now() + Math.random() })),
      status: product.status,
    });

    setEditingId(product._id);
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure to delete?")) {
      await deleteProduct(id);
      toast.success("Deleted!");
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const addSize = () =>
    setFormData({
      ...formData,
      sizes: [...formData.sizes, { id: Date.now() + Math.random(), size: "", stock: 0 }],
    });

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 relative">
      <Toaster position="top-right" />

      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-foreground">Products</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({
                name: "",
                price: "",
                category: categories[0] || "Jersey",
                subcategory: "",
                brand: "",
                description: "",
                image: "",
                sizes: [],
                status: "Active",
              });
              setPreview(null);
              setTimeout(() => {
                formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 150);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            <Plus size={20} /> Add Product
          </button>
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-black/40">
          <div
            ref={formRef}
            className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-200"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-semibold">
                {editingId ? "Edit Product" : "Add Product"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-red-500 transition"
              >
                <X size={22} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Product Name *
                </label>
                <input
                  placeholder="e.g., Manchester United Jersey"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Price *
                </label>
                <input
                  placeholder="e.g., 4999"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>

              {/* ✅ Dynamic Category Dropdown */}
              <div className="relative">
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    if (e.target.value === "__add_new__") {
                      setShowCategoryInput(true);
                    } else {
                      setFormData({ ...formData, category: e.target.value });
                    }
                  }}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  {/* <option value="__add_new__">+ Add New Category</option> */}
                </select>

                {/* Add New Category Input */}
                {showCategoryInput && (
                  <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white border rounded-lg shadow-lg z-10">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter new category"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") handleAddCategory();
                        }}
                        className="flex-1 border p-2 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleAddCategory}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowCategoryInput(false);
                          setNewCategory("");
                        }}
                        className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Subcategory *
                </label>
                <input
                  placeholder="e.g., Premier League"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Brand *
                </label>
                <input
                  placeholder="e.g., Adidas"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>

              {/* ✅ Description as Textarea - spans 2 columns */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Description *
                </label>
                <textarea
                  placeholder="Enter product description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none resize-none"
                />
              </div>
            </div>

            {/* Image Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Product Image</label>
              <div className="flex items-center gap-4">
                <label
                  htmlFor="image-upload"
                  className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-blue-50 transition-colors w-1/2"
                >
                  <Upload size={20} /> Upload Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  id="image-upload"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                {(preview || formData.image) && (
                  <img
                    src={
                      preview
                        ? preview
                        : typeof formData.image === "string"
                        ? formData.image
                        : URL.createObjectURL(formData.image)
                    }
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded-lg border"
                  />
                )}
              </div>
            </div>

            {/* Sizes */}
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Sizes & Stock *</h4>
              {formData.sizes.map((s) => (
                <div key={s.id} className="flex gap-2 mb-2">
                  <input
                    placeholder="Size (e.g., S, M, L)"
                    value={s.size || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sizes: formData.sizes.map((item) =>
                          item.id === s.id ? { ...item, size: e.target.value } : item
                        ),
                      })
                    }
                    className="border p-2 rounded-lg w-1/2"
                  />
                  <input
                    placeholder="Stock"
                    type="number"
                    value={s.stock ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sizes: formData.sizes.map((item) =>
                          item.id === s.id ? { ...item, stock: Number(e.target.value) } : item
                        ),
                      })
                    }
                    className="border p-2 rounded-lg w-1/2"
                  />
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        sizes: formData.sizes.filter((item) => item.id !== s.id),
                      })
                    }
                    className="px-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    X
                  </button>
                </div>
              ))}
              <button
                onClick={addSize}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Add Size
              </button>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleAddProduct}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product List */}
      <div className="grid gap-4 mt-6">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product, index) => (
            <div
              key={`${product._id}-${index}`} 
              className="p-4 border rounded-xl flex justify-between items-center gap-4 hover:shadow-md transition"
            >
              {product.image && (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-24 h-24 object-cover rounded-xl border"
                />
              )}
              <div className="flex-1">
                <h3 className="font-bold text-lg">{product.name}</h3>
                <p className="text-sm text-gray-500">
                  {product.category} / {product.subcategory}
                </p>
                <p className="text-sm">
                  Status:{" "}
                  <span
                    className={`font-bold ${
                      product.status === "Out of Stock"
                        ? "text-red-500"
                        : product.status === "Limited"
                        ? "text-orange-500"
                        : "text-green-600"
                    }`}
                  >
                    {product.status}
                  </span>
                </p>
              </div>
              <div className="flex gap-4 items-center">
                <div>
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="font-bold text-lg">₹{product.price}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Sizes</p>
                  <div className="flex gap-2 flex-wrap">
                    {product.sizes?.map((s) => (
                      <span
                        key={s.id || s.size}
                        className="px-2 py-1 border rounded text-xs bg-gray-50"
                      >
                        {s.size}: {s.stock}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="p-2 border rounded-lg hover:bg-blue-50"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(product._id)}
                    className="p-2 border rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">No products found</p>
        )}
      </div>
    </div>
  );
}