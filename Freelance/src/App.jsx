import { Routes, Route, useLocation, Navigate } from "react-router-dom"
import Home from "./User/pages/Home"
import Auth from "./User/pages/Auth"
import Otp from "./User/components/otp"
import Navbar from "./User/components/Navbar"
import CartList from "./User/pages/CartList"
import ProductDetailPage from "./User/pages/ProductDetailPage"
import Footer from "./User/components/Footer"
import ProfilePage from "./User/pages/ProfilePage"
import OrderPage from "./User/pages/OrderPage"
import AdminPanel from "./Admin/pages/adminpanel"
import { useUserStore } from "./store/UserSlice" // Import your user store

// Protected Route Component for Admin
const ProtectedAdminRoute = ({ children }) => {
  const { user, isAuthenticated } = useUserStore();
  
  // Check if user is authenticated and is an admin
  if (!isAuthenticated) {
    // Redirect to auth page if not logged in
    return <Navigate to="/auth" replace />;
  }
  
  if (user?.role !== "admin") {
    // Redirect to home if not an admin
    return <Navigate to="/" replace />;
  }
  
  // If authenticated and admin, render the children
  return children;
};

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  
  return (
    <>
      {!isAdminRoute && <Navbar />}
      
      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* Protected Admin Route */}
        <Route 
          path="/admin" 
          element={
            <ProtectedAdminRoute>
              <AdminPanel />
            </ProtectedAdminRoute>
          } 
        />
        
        <Route path="/auth" element={<Auth />} />
        <Route path="/otp" element={<Otp />} />
        <Route path="/cartpage" element={<CartList />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/orders" element={<OrderPage />} />
        <Route path="/detailpage/:id" element={<ProductDetailPage />} />
        
        {/* Catch-all route for 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {!isAdminRoute && <Footer />}
    </>
  )
}

export default App