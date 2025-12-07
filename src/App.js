import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

import LoginUser from './pages/LoginUser';
import LoginStaff from './pages/LoginStaff';
import UserMenu from './pages/UserMenu';
import CartPage from './pages/CartPage';
import OrderHistory from './pages/OrderHistory';
import AdminHome from './pages/AdminHome';
import AdminLiveOrders from './pages/AdminLiveOrders';
import AdminHistory from './pages/AdminHistory';
import AdminProducts from './pages/AdminProducts';
import AdminTables from './pages/AdminTables';
import AdminReports from './pages/AdminReports';
import UserProfile from './pages/UserProfile';
import SetupPage from './pages/SetupPage';

import AdminLayout from './layouts/AdminLayout';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { currentUser, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  if (!currentUser) {
    return <Navigate to={`/login${location.search}`} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) return <Navigate to="/" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
          <Routes>
            <Route path="/setup-toko" element={<SetupPage />} />
            <Route path="/login" element={<LoginUser />} />
            <Route path="/staff-login" element={<LoginStaff />} />

            <Route path="/" element={<PrivateRoute allowedRoles={['user', 'admin', 'head']}><UserMenu /></PrivateRoute>} />
            <Route path="/cart" element={<PrivateRoute allowedRoles={['user', 'admin', 'head']}><CartPage /></PrivateRoute>} />
            <Route path="/history" element={<PrivateRoute allowedRoles={['user', 'admin', 'head']}><OrderHistory /></PrivateRoute>} />

            {/* RUTE ADMIN */}
            <Route path="/admin" element={<PrivateRoute allowedRoles={['admin']}><AdminLayout /></PrivateRoute>}>
              <Route index element={<AdminHome />} />
              <Route path="live-orders" element={<AdminLiveOrders />} />
              <Route path="history" element={<AdminHistory />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="tables" element={<AdminTables />} />
              <Route path="reports" element={<AdminReports />} />
            </Route>

            {/* RUTE KEPALA TOKO (Akses Laporan Saja) */}
            <Route path="/head" element={<PrivateRoute allowedRoles={['head', 'admin']}><AdminLayout /></PrivateRoute>}>
              <Route index element={<AdminReports />} />
            </Route>

            {/* PROFILE (Admin & Kepala Bisa Akses) */}
            <Route path="/profile" element={<PrivateRoute allowedRoles={['admin', 'head']}><AdminLayout /></PrivateRoute>}>
              <Route index element={<UserProfile />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;