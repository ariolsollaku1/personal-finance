import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { SidebarLayout } from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import { DashboardSkeleton } from './components/Skeleton';

const SwipeAccountPage = lazy(() => import('./pages/SwipeAccountPage'));
const TransfersPage = lazy(() => import('./pages/TransfersPage'));
const ProjectionPage = lazy(() => import('./pages/ProjectionPage'));
const PnLPage = lazy(() => import('./pages/PnLPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const CategoriesPage = lazy(() => import('./pages/settings/CategoriesPage'));
const PayeesPage = lazy(() => import('./pages/settings/PayeesPage'));
const CurrencyPage = lazy(() => import('./pages/settings/CurrencyPage'));
const ArchivedAccountsPage = lazy(() => import('./pages/settings/ArchivedAccountsPage'));

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Protected routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <ErrorBoundary>
              <SidebarLayout>
                <Suspense fallback={<DashboardSkeleton />}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/accounts/:id" element={<SwipeAccountPage />} />
                    <Route path="/transfers" element={<TransfersPage />} />
                    <Route path="/projection" element={<ProjectionPage />} />
                    <Route path="/pnl" element={<PnLPage />} />
                    <Route path="/settings/*" element={<SettingsPage />}>
                      <Route path="categories" element={<CategoriesPage />} />
                      <Route path="payees" element={<PayeesPage />} />
                      <Route path="currency" element={<CurrencyPage />} />
                      <Route path="archived" element={<ArchivedAccountsPage />} />
                    </Route>
                  </Routes>
                </Suspense>
              </SidebarLayout>
            </ErrorBoundary>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
