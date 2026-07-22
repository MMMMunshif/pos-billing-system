import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductFormPage = lazy(() => import('./pages/ProductFormPage'));
const AddStockPage = lazy(() => import('./pages/AddStockPage'));
const SalesPage = lazy(() => import('./pages/SalesPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const CustomerDetailsPage = lazy(() => import('./pages/CustomerDetailsPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="products/new" element={<ProductFormPage />} />
                <Route path="products/edit/:id" element={<ProductFormPage />} />
                <Route path="stock" element={<AddStockPage />} />
                <Route path="sales" element={<SalesPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="customers/:id" element={<CustomerDetailsPage />} />
                <Route path="payments" element={<PaymentPage />} />
                <Route path="reports" element={<ReportsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
