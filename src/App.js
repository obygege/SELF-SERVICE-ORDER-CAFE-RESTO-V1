import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

import LoginUser from './pages/LoginUser';
import LoginStaff from './pages/LoginStaff';
import LoginKitchenBarista from './pages/LoginKitchenBarista';
import UserMenu from './pages/UserMenu';
import CartPage from './pages/CartPage';
import OrderHistory from './pages/OrderHistory';
import AdminHome from './pages/AdminHome';
import AdminLiveOrders from './pages/AdminLiveOrders';
import AdminHistory from './pages/AdminHistory';
import AdminProducts from './pages/AdminProducts';
import AdminTables from './pages/AdminTables';
import AdminReports from './pages/AdminReports';
import AdminSettings from './pages/AdminSettings';
import UserProfile from './pages/UserProfile';
import SetupPage from './pages/SetupPage';
import AdminLayout from './layouts/AdminLayout';
import KitchenDisplay from './pages/KitchenDisplay';
import BaristaDisplay from './pages/BaristaDisplay';
import HeadHistory from './pages/HeadHistory';
import HeadDatabase from './pages/HeadDatabase';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { currentUser, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  if (!currentUser) {
    if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/head')) {
      return <Navigate to="/staff-login" replace />;
    }
    if (location.pathname.startsWith('/kitchen') || location.pathname.startsWith('/barista')) {
      return <Navigate to="/kitchen-login" replace />;
    }
    return <Navigate to={`/login${location.search}`} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    if (userRole === 'user') return <Navigate to="/" />;
    if (userRole === 'admin') return <Navigate to="/admin" />;
    if (userRole === 'head') return <Navigate to="/head" />;
    if (userRole === 'kitchen') return <Navigate to="/kitchen" />;
    if (userRole === 'barista') return <Navigate to="/barista" />;
    return <Navigate to="/" />;
  }

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
            <Route path="/kitchen-login" element={<LoginKitchenBarista />} />

            <Route path="/" element={<PrivateRoute allowedRoles={['user', 'admin', 'head']}><UserMenu /></PrivateRoute>} />
            <Route path="/cart" element={<PrivateRoute allowedRoles={['user', 'admin', 'head']}><CartPage /></PrivateRoute>} />
            <Route path="/history" element={<PrivateRoute allowedRoles={['user', 'admin', 'head']}><OrderHistory /></PrivateRoute>} />

            <Route path="/admin" element={<PrivateRoute allowedRoles={['admin']}><AdminLayout /></PrivateRoute>}>
              <Route index element={<AdminHome />} />
              <Route path="live-orders" element={<AdminLiveOrders />} />
              <Route path="history" element={<AdminHistory />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="tables" element={<AdminTables />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            <Route path="/head" element={<PrivateRoute allowedRoles={['head', 'admin']}><AdminLayout /></PrivateRoute>}>
              <Route index element={<AdminReports />} />
              <Route path="history" element={<HeadHistory />} />
            </Route>

            <Route path="/kitchen" element={<PrivateRoute allowedRoles={['kitchen', 'head', 'admin']}><KitchenDisplay /></PrivateRoute>} />

            <Route path="/barista" element={<PrivateRoute allowedRoles={['barista', 'head', 'admin']}><BaristaDisplay /></PrivateRoute>} />

            <Route path="/profile" element={<PrivateRoute allowedRoles={['admin', 'head', 'user', 'kitchen', 'barista']}><AdminLayout /></PrivateRoute>}>
              <Route index element={<UserProfile />} />
            </Route>

            <Route path="/head" element={<PrivateRoute allowedRoles={['head', 'admin']}><AdminLayout /></PrivateRoute>}>
              <Route index element={<AdminReports />} />
              <Route path="history" element={<HeadHistory />} />
              <Route path="database" element={<HeadDatabase />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;