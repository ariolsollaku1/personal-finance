import { Routes, Route } from 'react-router-dom';
import { SidebarLayout } from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import AccountPage from './pages/AccountPage';
import AddAccountPage from './pages/AddAccountPage';
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
            <SidebarLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/accounts/new" element={<AddAccountPage />} />
                <Route path="/accounts/:id" element={<AccountPage />} />
                <Route path="/transfers" element={<TransfersPage />} />
                <Route path="/projection" element={<ProjectionPage />} />
                <Route path="/pnl" element={<PnLPage />} />
                <Route path="/settings/categories" element={<CategoriesPage />} />
                <Route path="/settings/payees" element={<PayeesPage />} />
                <Route path="/settings/currency" element={<CurrencyPage />} />
              </Routes>
            </SidebarLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
