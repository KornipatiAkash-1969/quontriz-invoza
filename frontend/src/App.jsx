import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProductTourProvider } from './context/ProductTourContext';
import { UpdatesProvider } from './context/UpdatesContext';
import Layout from './components/layout/Layout';
import { Spinner, ErrorBoundary, PageLoader } from './components/ui';

// Pages
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import InvoiceReviewPage from './pages/InvoiceReviewPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import UsersPage from './pages/UsersPage';
import VendorsPage from './pages/VendorsPage';
import VendorDetailPage from './pages/VendorDetailPage';
import CategoriesPage from './pages/CategoriesPage';
import VendorTypesPage from './pages/VendorTypesPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import RequirementsPage from './pages/RequirementsPage';

/**
 * Route guard requiring authentication.
 * If user is not authenticated, immediately redirects to /login.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <PageLoader message="Verifying session..." subtitle="Securing your store workspace" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/**
 * Route guard for /login.
 * If user is already authenticated, redirects to / (http://localhost:5173).
 */
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <PageLoader message="Initializing Quontriz Invoza..." subtitle="Checking authentication status" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/**
 * Route guard restricted exclusively to Store Owner.
 * If a Staff user attempts access, they are redirected to /upload.
 */
function OwnerRoute({ children }) {
  const { isOwner, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <PageLoader message="Verifying Owner permissions..." subtitle="Checking role-based access rights" />
      </div>
    );
  }
  if (!isOwner) {
    return <Navigate to="/upload" replace />;
  }

  return children;
}

/**
 * Index route at http://localhost:5173/ ('/'):
 * Owner sees Store Dashboard; Staff has no dashboard and is redirected to /upload.
 */
function IndexRoute() {
  const { isOwner, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <PageLoader message="Loading dashboard..." subtitle="Preparing store financial overview" />
      </div>
    );
  }

  return isOwner ? <DashboardPage /> : <Navigate to="/upload" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
      <AuthProvider>
        <ProductTourProvider>
          <UpdatesProvider>
            <BrowserRouter>
          <Routes>
            {/* Public Login Route */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />

            {/* Protected Application Shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Index: Owner -> Dashboard, Staff -> Upload */}
              <Route index element={<IndexRoute />} />

              {/* Owner-Only Dashboard Route */}
              <Route
                path="dashboard"
                element={
                  <OwnerRoute>
                    <DashboardPage />
                  </OwnerRoute>
                }
              />

              {/* Both Staff & Owner Access */}
              <Route path="upload" element={<UploadPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="invoices/review" element={<InvoiceReviewPage />} />
              <Route path="invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="requirements" element={<RequirementsPage />} />

              {/* Owner-Only Routes */}
              <Route
                path="users"
                element={
                  <OwnerRoute>
                    <UsersPage />
                  </OwnerRoute>
                }
              />
              <Route
                path="vendors"
                element={
                  <OwnerRoute>
                    <VendorsPage />
                  </OwnerRoute>
                }
              />
              <Route
                path="vendors/:id"
                element={
                  <OwnerRoute>
                    <VendorDetailPage />
                  </OwnerRoute>
                }
              />
              <Route
                path="categories"
                element={
                  <OwnerRoute>
                    <CategoriesPage />
                  </OwnerRoute>
                }
              />
              <Route
                path="vendor-types"
                element={
                  <OwnerRoute>
                    <VendorTypesPage />
                  </OwnerRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <OwnerRoute>
                    <SettingsPage />
                  </OwnerRoute>
                }
              />
              <Route path="ai-training" element={<Navigate to="/invoices" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
          </UpdatesProvider>
        </ProductTourProvider>
      </AuthProvider>
    </ToastProvider>
    </ErrorBoundary>
  );
}
