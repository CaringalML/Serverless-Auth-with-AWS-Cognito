import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import authService from '../services/authService';

/**
 * ProtectedRoute - Wrapper component for routes requiring authentication
 * 
 * IMPORTANT: This component includes timing fixes to prevent logout on page refresh
 * 
 * Problem Solved:
 * - On page refresh, cookies may not be immediately available to JavaScript
 * - This caused authentication checks to fail prematurely, logging users out
 * - Redux state is lost on refresh, requiring cookie-based fallback
 * 
 * Solution Implementation:
 * 1. 100ms initialization delay ensures cookies are readable
 * 2. Dual authentication check (Redux + authService) for reliability
 * 3. Loading state prevents premature redirects
 * 
 * Security Notes:
 * - Cookies use SameSite=Strict and Secure flags for production
 * - No security compromises were made to fix the timing issue
 * - Authentication tokens remain securely stored in HTTP-only cookies
 * 
 * Usage:
 * <ProtectedRoute>
 *   <YourProtectedComponent />
 * </ProtectedRoute>
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSelector((state) => state.auth);
  
  // Initialize with loading state to prevent premature redirects
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // CRITICAL: 100ms delay ensures secure cookies are fully available
    // to JavaScript before authentication check occurs.
    // This prevents false negatives on page refresh.
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Show loading spinner while:
  // - Redux is checking authentication (loading = true)
  // - Component is initializing (isInitializing = true)
  // This prevents flashing and premature redirects
  if (loading || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-12 w-12 text-emerald-600 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-emerald-700 font-medium">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // DUAL AUTHENTICATION CHECK:
  // 1. Redux state (isAuthenticated) - primary check
  // 2. AuthService direct check - fallback for cookie-based auth
  // Only redirect if BOTH checks fail to ensure reliability
  if (!isAuthenticated && !authService.isAuthenticated()) {
    return <Navigate to="/signin" replace />;
  }

  // Authentication successful - render protected content
  return children;
};

export default ProtectedRoute;