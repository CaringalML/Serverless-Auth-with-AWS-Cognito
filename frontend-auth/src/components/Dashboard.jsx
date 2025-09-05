import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../store/slices/authSlice';
import authService from '../services/authService';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [userInfo, setUserInfo] = useState(null);
  const [loadingUserInfo, setLoadingUserInfo] = useState(false);

  useEffect(() => {
    // Load user info if not available in Redux state
    const loadUserInfo = async () => {
      if (!user && isAuthenticated) {
        setLoadingUserInfo(true);
        try {
          const info = await authService.getUserInfo();
          setUserInfo(info);
        } catch (error) {
          // Error loading user info
        } finally {
          setLoadingUserInfo(false);
        }
      }
    };

    if (isAuthenticated) {
      loadUserInfo();
    }
  }, [user, isAuthenticated]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      dispatch(logout());
      navigate('/signin');
    } catch (error) {
      // Logout failed
      // Still redirect even if logout API call fails
      dispatch(logout());
      navigate('/signin');
    }
  };

  const displayUser = user || userInfo;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Welcome to Your Dashboard!</h2>
          
          {loadingUserInfo ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-3 text-gray-600">Loading user information...</span>
            </div>
          ) : displayUser && (
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">User Information</h3>
                <div className="space-y-2">
                  <p className="text-gray-600">
                    <span className="font-medium">Name:</span> {displayUser.name || 'N/A'}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Email:</span> {displayUser.email}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Email Verified:</span>{' '}
                    <span className={displayUser.email_verified ? 'text-green-600' : 'text-red-600'}>
                      {displayUser.email_verified ? 'Yes' : 'No'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Security Information</h3>
                <div className="bg-green-50 p-4 rounded-md">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="font-medium text-green-800">Secure httpOnly Cookies</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Your authentication tokens are stored in secure httpOnly cookies that cannot be accessed by JavaScript, providing maximum protection against XSS attacks.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              🛡️ This is a protected route with maximum security. You can only access this page when authenticated.
              Your JWT tokens are stored in secure httpOnly cookies and automatically included in all API requests.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;