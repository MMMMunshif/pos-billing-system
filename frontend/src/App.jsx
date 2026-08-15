import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { useAuth } from './context/authContext';

import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductFormPage = lazy(() => import('./pages/ProductFormPage'));
const AddStockPage = lazy(() => import('./pages/AddStockPage'));
const SalesPage = lazy(() => import('./pages/SalesPage'));
const SalesHistoryPage = lazy(() => import('./pages/SalesHistoryPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const CustomerDetailsPage = lazy(() => import('./pages/CustomerDetailsPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));

function DashboardRouter() {
  const { userProfile } = useAuth();

  if (!userProfile) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (userProfile.role === 'staff') {
    return <StaffDashboard />;
  }

  return <DashboardPage />;
}

function AdminOnly({ children }) {
  const { userProfile } = useAuth();

  if (!userProfile) {
    return <LoadingSpinner message="Checking permission..." />;
  }

  if (userProfile.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
            <Routes>
              {/* Public landing page */}
              <Route path="/" element={<HomePage />} />

              {/* Public login page */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected system pages */}
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardRouter />} />

                <Route path="/products" element={<ProductsPage />} />

                <Route
                  path="/products/new"
                  element={
                    <AdminOnly>
                      <ProductFormPage />
                    </AdminOnly>
                  }
                />

                <Route
                  path="/products/edit/:id"
                  element={
                    <AdminOnly>
                      <ProductFormPage />
                    </AdminOnly>
                  }
                />

                <Route
                  path="/stock"
                  element={
                    <AdminOnly>
                      <AddStockPage />
                    </AdminOnly>
                  }
                />

                <Route path="/sales" element={<SalesPage />} />

                <Route path="/sales-history" element={<SalesHistoryPage />} />

                <Route path="/customers" element={<CustomersPage />} />

                <Route
                  path="/customers/:id"
                  element={<CustomerDetailsPage />}
                />

                <Route
                  path="/payments"
                  element={
                    <AdminOnly>
                      <PaymentPage />
                    </AdminOnly>
                  }
                />

                <Route
                  path="/expenses"
                  element={
                    <AdminOnly>
                      <ExpensesPage />
                    </AdminOnly>
                  }
                />

                <Route
                  path="/reports"
                  element={
                    <AdminOnly>
                      <ReportsPage />
                    </AdminOnly>
                  }
                />
              </Route>

              {/* Unknown routes go to landing page */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}