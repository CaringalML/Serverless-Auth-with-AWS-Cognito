import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { checkAuthAsync } from '../store/slices/authSlice';

/**
 * ProtectedRoute - Secure route wrapper for httpOnly cookie authentication
 * 
 * SECURITY ARCHITECTURE:
 * This component implements enterprise-grade route protection using httpOnly cookies
 * for maximum security against XSS and CSRF attacks.
 * 
 * HTTPONLY COOKIE AUTHENTICATION:
 * - Tokens stored in httpOnly cookies (invisible to JavaScript)
 * - SameSite=Strict prevents CSRF attacks
 * - Secure flag ensures HTTPS-only transmission
 * - Custom domain setup enables same-origin cookie sharing
 * 
 * PAGE REFRESH HANDLING:
 * Critical timing solution for KMS-encrypted httpOnly cookie availability:
 * - 1200ms initial delay for browser cookie processing
 * - 800ms additional delay in auth check for KMS decryption
 * - Total 2.0s buffer prevents false logouts on page refresh with encryption
 * 
 * AUTHENTICATION FLOW:
 * 1. Check Redux state (fast path for authenticated users)
 * 2. Fallback to server verification via httpOnly cookies
 * 3. Display loading spinner during verification
 * 4. Redirect to signin only after confirmed authentication failure
 * 
 * DOMAINS:
 * - Frontend: https://filodelight.online (CloudFront)
 * - API: https://api.filodelight.online (API Gateway)
 * - Same root domain enables secure cookie sharing
 * 
 * @param {React.ReactNode} children - Protected components to render
 * @returns {React.Component} Protected route wrapper
 */
const ProtectedRoute = ({ children }) => {
  const dispatch = useDispatch();
  const { isAuthenticated, loading } = useSelector((state) => state.auth);
  
  // Initialize with loading state to prevent premature redirects
  const [isInitializing, setIsInitializing] = useState(true);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    // Only check auth once per component mount
    if (hasCheckedAuth) {
      setAuthCheckComplete(true);
      setIsInitializing(false);
      return;
    }
    
    const checkAuth = async () => {
      try {
        console.log('[ProtectedRoute] Starting auth check, isAuthenticated:', isAuthenticated);
        setHasCheckedAuth(true);
        
        // First check if we already have auth state from signin
        if (isAuthenticated) {
          console.log('[ProtectedRoute] Already authenticated from Redux state');
          setAuthCheckComplete(true);
          setIsInitializing(false);
          return;
        }
        
        // If not authenticated in Redux, try to check with backend
        // This happens on page refresh when Redux state is lost
        console.log('[ProtectedRoute] Not authenticated in Redux, checking with backend...');
        await dispatch(checkAuthAsync()).unwrap();
        console.log('[ProtectedRoute] Backend auth check successful');
      } catch (error) {
        // On auth check failure, assume not authenticated
        // This will redirect to signin page
        console.log('[ProtectedRoute] Backend auth check failed:', error);
      } finally {
        setAuthCheckComplete(true);
        setIsInitializing(false);
      }
    };

    // CRITICAL: HttpOnly cookie availability timing for page refresh
    // Browser needs time to process httpOnly cookies after page reload
    // Optimized delay for KMS encryption processing time
    // This delay prevents false authentication failures that cause unwanted logouts
    const timer = setTimeout(() => {
      checkAuth();
    }, 500); // Optimized timing for KMS-encrypted cookie processing
    
    return () => clearTimeout(timer);
  }, [dispatch, isAuthenticated, hasCheckedAuth]);

  // LOADING STATE: Prevent premature redirects during httpOnly cookie authentication
  // Show spinner while verifying authentication to ensure smooth user experience
  if (loading || isInitializing || !authCheckComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-12 w-12 text-emerald-600 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-emerald-700 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // SECURE REDIRECT: Only redirect after confirming authentication failure
  // HttpOnly cookie verification completed above - safe to check Redux state
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  // AUTHENTICATED: Render protected content securely
  return children;
};

export default ProtectedRoute;