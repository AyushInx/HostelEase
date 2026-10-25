import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { StudentLoginPage } from './pages/StudentLoginPage';
import { StaffLoginPage } from './pages/StaffLoginPage';
import { DashboardPlaceholderPage } from './pages/DashboardPlaceholderPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login/student" element={<StudentLoginPage />} />
            <Route path="/login/staff" element={<StaffLoginPage />} />
            <Route path="/dashboard" element={<DashboardPlaceholderPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
