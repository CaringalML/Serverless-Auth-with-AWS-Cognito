import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import SignUp from './components/SignUp';
import SignIn from './components/SignIn';
import Verify from './components/Verify';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import InactivityWarning from './components/InactivityWarning';
import RecaptchaProvider from './components/RecaptchaProvider';

function App() {
  // Note: Auth checking is now handled by ProtectedRoute components
  // This prevents race conditions and duplicate auth checks

  return (
    <RecaptchaProvider>
      <Router>
        <div>
          <Routes>
            <Route path="/" element={<Navigate to="/signin" replace />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
          
          {/* Global Inactivity Warning */}
          <InactivityWarning />
        </div>
      </Router>
    </RecaptchaProvider>
  );
}

export default App;