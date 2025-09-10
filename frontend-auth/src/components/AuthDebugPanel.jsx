import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import authService from '../services/authService';
import employeeService from '../services/employeeService';

const AuthDebugPanel = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [debugInfo, setDebugInfo] = useState({
    authCheck: null,
    apiTest: null,
    cookieTest: null,
    timestamp: null
  });
  const [testing, setTesting] = useState(false);

  const runAuthTests = async () => {
    setTesting(true);
    const timestamp = new Date().toISOString();
    
    try {
      // Test 1: Auth service check
      const authResult = await authService.isAuthenticated();
      
      // Test 2: Employee API test
      let apiResult;
      try {
        await employeeService.getEmployees();
        apiResult = 'SUCCESS';
      } catch (error) {
        apiResult = `FAILED: ${error.message}`;
      }
      
      // Test 3: Cookie check (from browser)
      const cookieResult = document.cookie ? 'Cookies present' : 'No cookies found';
      
      setDebugInfo({
        authCheck: authResult ? 'AUTHENTICATED' : 'NOT AUTHENTICATED',
        apiTest: apiResult,
        cookieTest: cookieResult,
        timestamp
      });
    } catch (error) {
      setDebugInfo({
        authCheck: `ERROR: ${error.message}`,
        apiTest: 'NOT TESTED',
        cookieTest: 'NOT TESTED',
        timestamp
      });
    }
    
    setTesting(false);
  };

  useEffect(() => {
    // Auto-run tests when component mounts
    if (isAuthenticated) {
      setTimeout(runAuthTests, 1000); // 1 second delay
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null; // Only show for authenticated users
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-gray-900">Auth Debug</h3>
          <button
            onClick={runAuthTests}
            disabled={testing}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test'}
          </button>
        </div>
        
        <div className="space-y-2 text-xs">
          <div>
            <span className="font-medium">Redux Auth:</span>{' '}
            <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
              {isAuthenticated ? 'TRUE' : 'FALSE'}
            </span>
          </div>
          
          <div>
            <span className="font-medium">User:</span>{' '}
            <span className="text-gray-600">
              {user?.email || 'None'}
            </span>
          </div>
          
          {debugInfo.timestamp && (
            <>
              <div className="border-t pt-2">
                <div>
                  <span className="font-medium">Auth Check:</span>{' '}
                  <span className={debugInfo.authCheck?.includes('AUTHENTICATED') ? 'text-green-600' : 'text-red-600'}>
                    {debugInfo.authCheck}
                  </span>
                </div>
                
                <div>
                  <span className="font-medium">API Test:</span>{' '}
                  <span className={debugInfo.apiTest === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}>
                    {debugInfo.apiTest}
                  </span>
                </div>
                
                <div>
                  <span className="font-medium">Cookies:</span>{' '}
                  <span className="text-gray-600">
                    {debugInfo.cookieTest}
                  </span>
                </div>
                
                <div className="text-xs text-gray-500 mt-1">
                  Last: {new Date(debugInfo.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthDebugPanel;