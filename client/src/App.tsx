import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import ServersPage from './pages/admin/ServersPage';
import ClosuresPage from './pages/admin/ClosuresPage';
import UsersPage from './pages/admin/UsersPage';
import SecurityPage from './pages/admin/SecurityPage';

export default function App() {
  return (
    <BrowserRouter>
      {/*
        Les deux providers sont montés une seule fois au sommet de l'arbre.
        Leur état (token, admin/user) persiste quelle que soit la navigation.
      */}
      <AdminAuthProvider>
        <AuthProvider>
          <Routes>
            {/* ── Routes admin ─────────────────────────────────────── */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            <Route
              path="/admin"
              element={
                <AdminProtectedRoute>
                  <AdminLayout />
                </AdminProtectedRoute>
              }
            >
              <Route index element={<Navigate to="servers" replace />} />
              <Route path="servers" element={<ServersPage />} />
              <Route path="closures" element={<ClosuresPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="security" element={<SecurityPage />} />
            </Route>

            {/* ── Routes utilisateur ───────────────────────────────── */}
            <Route path="/login" element={<LoginPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
            </Route>

            {/* Catch-all : toute URL inconnue → accueil */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
