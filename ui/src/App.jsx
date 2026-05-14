import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { UIProvider } from './context/UIContext';
import { ToastProvider } from './components/Common/Toast';
import Sidebar from './components/Sidebar/Sidebar';
import HKDDashboard from './pages/HKDDashboard';
import CustomerManagement from './pages/CustomerManagement';
import ConfigPage from './pages/ConfigPage';
import FieldsPage from './pages/FieldsPage';
import AdminPage from './pages/AdminPage';
import CompanyDashboard from './pages/CompanyDashboard';
import CompanyExportPage from './pages/CompanyExportPage';
import LoginPage from './pages/LoginPage';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-page">
        <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AppLayout = () => {
  const [customerFilter, setCustomerFilter] = useState(null);
  const [companyCustomerFilter, setCompanyCustomerFilter] = useState(null);
  const { can } = useAuth();

  return (
    <div className="flex h-screen bg-surface text-strong font-sans overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/hkd" replace />} />

          <Route path="/home" element={
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-page text-weak italic">
              <h2 className="text-xl font-black italic uppercase tracking-widest text-orange-600/20">CENVI CRM DASHBOARD</h2>
            </div>
          } />

          <Route path="/customers" element={
            <CustomerManagement
              onShowHKDs={(id) => setCustomerFilter(id)}
              onShowCompanies={(id) => setCompanyCustomerFilter(id)}
            />
          } />

          <Route path="/hkd" element={
            <HKDDashboard
              customerFilter={customerFilter}
              setCustomerFilter={setCustomerFilter}
            />
          } />

          <Route path="/hkd/:id" element={
            <HKDDashboard
              customerFilter={customerFilter}
              setCustomerFilter={setCustomerFilter}
            />
          } />

          <Route path="/company" element={<CompanyDashboard customerFilter={companyCustomerFilter} setCustomerFilter={setCompanyCustomerFilter} />} />
          <Route path="/company/:id" element={<CompanyDashboard customerFilter={companyCustomerFilter} setCustomerFilter={setCompanyCustomerFilter} />} />
          <Route path="/company/:id/export" element={<CompanyExportPage />} />

          <Route path="/fields" element={<FieldsPage />} />

          <Route path="/config" element={
            can('config')
              ? <ConfigPage />
              : <div className="flex-1 flex items-center justify-center bg-page">
                  <p className="text-weak font-bold text-sm">Bạn không có quyền truy cập trang này.</p>
                </div>
          } />

          <Route path="/admin" element={
            can('users')
              ? <AdminPage />
              : <div className="flex-1 flex items-center justify-center bg-page">
                  <p className="text-weak font-bold text-sm">Bạn không có quyền truy cập trang này.</p>
                </div>
          } />

          <Route path="*" element={<Navigate to="/hkd" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <UIProvider>
      <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPageWrapper />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
      </ToastProvider>
      </UIProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

// Redirect to /hkd if already logged in
const LoginPageWrapper = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/hkd" replace />;
  return <LoginPage />;
};

export default App;
