import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from './ProtectedRoute';
import LandingPage from '../pages/LandingPage';
import RegisterPage from '../pages/RegisterPage';
import LoginPage from '../pages/LoginPage';
import UserDashboardPage from '../pages/UserDashboardPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import RegistrationDetailsPage from '../pages/RegistrationDetailsPage';
import EditRegistrationPage from '../pages/EditRegistrationPage';
import NotFoundPage from '../pages/NotFoundPage';
import PaymentPage from '../pages/PaymentPage';
import AdminUsersOverviewPage from '../pages/AdminUsersOverviewPage';

function AppRouter() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={['user', 'admin']}>
              <UserDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/registration-details"
          element={
            <ProtectedRoute roles={['user', 'admin']}>
              <RegistrationDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/registration-details/edit"
          element={
            <ProtectedRoute roles={['user', 'admin']}>
              <EditRegistrationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute roles={['user', 'admin']}>
              <PaymentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/:userId/registration-details"
          element={
            <ProtectedRoute roles={['admin']}>
              <RegistrationDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users-overview"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminUsersOverviewPage />
            </ProtectedRoute>
          }
        />
        <Route path="/not-found" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/not-found" replace />} />
      </Route>
    </Routes>
  );
}

export default AppRouter;
