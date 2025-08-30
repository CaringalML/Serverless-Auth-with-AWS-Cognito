import React, { useState, useEffect } from 'react';
import authService from '../services/authService';

const InactivityWarning = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    // Set up inactivity warning callback
    authService.setInactivityWarningCallback((secondsUntilLogout) => {
      setTimeLeft(secondsUntilLogout);
      setShowWarning(true);
      
      // Start countdown
      const countdown = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdown);
            setShowWarning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    // Set up inactivity logout callback
    authService.setInactivityLogoutCallback(() => {
      setShowWarning(false);
    });

    return () => {
      // Cleanup
      authService.setInactivityWarningCallback(null);
      authService.setInactivityLogoutCallback(null);
    };
  }, []);

  const handleExtendSession = () => {
    authService.extendSession();
    setShowWarning(false);
  };

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/signin';
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md mx-4 shadow-2xl border border-gray-200">
        <div className="text-center">
          {/* Warning Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
            <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          {/* Warning Message */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Session Expiring Soon
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            You'll be automatically logged out due to inactivity in:
          </p>

          {/* Countdown Timer */}
          <div className="text-3xl font-bold text-red-600 mb-6">
            {formatTime(timeLeft)}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 justify-center">
            <button
              onClick={handleExtendSession}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Stay Logged In
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
            >
              Logout Now
            </button>
          </div>

          {/* Additional Info */}
          <p className="text-xs text-gray-500 mt-4">
            Click anywhere or press any key to extend your session
          </p>
        </div>
      </div>
    </div>
  );
};

export default InactivityWarning;