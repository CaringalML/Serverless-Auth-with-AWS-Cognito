import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../store/slices/authSlice';
import authService from '../services/authService';
import EmployeeManagement from './EmployeeManagement';
import AuthDebugPanel from './AuthDebugPanel';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [userInfo, setUserInfo] = useState(null);
  const [loadingUserInfo, setLoadingUserInfo] = useState(false);
  const [currentView, setCurrentView] = useState('overview'); // 'overview' or 'employees'

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

  const renderContent = () => {
    switch (currentView) {
      case 'employees':
        return <EmployeeManagement />;
      case 'overview':
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

            {/* Quick Actions */}
            <div className="pt-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => setCurrentView('employees')}
                  className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg p-6 text-left transition-colors"
                >
                  <div className="flex items-center mb-2">
                    <svg className="h-6 w-6 text-emerald-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.121M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 00-9.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="font-medium text-emerald-800">Employee Management</span>
                  </div>
                  <p className="text-sm text-emerald-600">Manage your team members, add, edit, and organize employee records</p>
                </button>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center mb-2">
                    <svg className="h-6 w-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="font-medium text-blue-800">Reports (Coming Soon)</span>
                  </div>
                  <p className="text-sm text-blue-600">View analytics and generate reports for your organization</p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                  <div className="flex items-center mb-2">
                    <svg className="h-6 w-6 text-purple-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium text-purple-800">Settings (Coming Soon)</span>
                  </div>
                  <p className="text-sm text-purple-600">Configure system settings and preferences</p>
                </div>
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
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">HR Dashboard</h1>
              
              {/* Navigation Menu */}
              <div className="hidden md:flex space-x-4">
                <button
                  onClick={() => setCurrentView('overview')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'overview'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setCurrentView('employees')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'employees'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Employees
                </button>
              </div>
            </div>
            
            {/* User Info and Logout */}
            <div className="flex items-center space-x-4">
              {displayUser && (
                <div className="hidden md:block text-sm text-gray-600">
                  Welcome, {displayUser.name || displayUser.email}
                </div>
              )}
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {renderContent()}
      
      {/* Debug Panel for Testing Authentication */}
      <AuthDebugPanel />
    </div>
  );
};

export default Dashboard;