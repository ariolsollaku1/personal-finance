import { Routes, Route } from 'react-router-dom';
import { SidebarLayout } from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import SwipeAccountPage from './pages/SwipeAccountPage';
import TransfersPage from './pages/TransfersPage';
import SettingsPage from './pages/SettingsPage';
import CategoriesPage from './pages/settings/CategoriesPage';
import PayeesPage from './pages/settings/PayeesPage';
import CurrencyPage from './pages/settings/CurrencyPage';
import ArchivedAccountsPage from './pages/settings/ArchivedAccountsPage';
import ProjectionPage from './pages/ProjectionPage';
import PnLPage from './pages/PnLPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AuthCallbackPage from './pages/AuthCallbackPage';

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
              </SidebarLayout>
            </ErrorBoundary>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
