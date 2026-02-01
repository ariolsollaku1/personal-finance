import { Routes, Route } from 'react-router-dom';
import { SidebarLayout } from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import SwipeAccountPage from './pages/SwipeAccountPage';
import TransfersPage from './pages/TransfersPage';
import CategoriesPage from './pages/settings/CategoriesPage';
import PayeesPage from './pages/settings/PayeesPage';
import CurrencyPage from './pages/settings/CurrencyPage';
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
                  <Route path="/settings/categories" element={<CategoriesPage />} />
                  <Route path="/settings/payees" element={<PayeesPage />} />
                  <Route path="/settings/currency" element={<CurrencyPage />} />
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
