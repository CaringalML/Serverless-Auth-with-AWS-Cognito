import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { forgotPassword } from '../store/slices/authSlice';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isCodeSent) {
      const interval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            navigate('/reset-password', { state: { email } });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isCodeSent, navigate, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const result = await dispatch(forgotPassword({ email }));

    if (forgotPassword.fulfilled.match(result)) {
      setIsCodeSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">Forgot Password?</h2>
        <p className="text-center text-gray-600 mb-8">
          {isCodeSent ? 'Reset code sent successfully!' : "Enter your email and we'll send you a reset code"}
        </p>
        
        {isCodeSent && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-4 rounded-lg mb-4 relative overflow-hidden">
            <div className="flex items-center">
              <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-lg">Reset code sent!</p>
                <p className="text-sm mt-1">
                  Check your email for the reset code. Redirecting in{' '}
                  <span className="font-bold text-green-800 text-base">
                    {redirectCountdown}
                  </span>
                  {' '}second{redirectCountdown !== 1 ? 's' : ''}...
                </p>
              </div>
              <div className="ml-4">
                <div className="relative w-12 h-12">
                  <svg className="transform -rotate-90 w-12 h-12">
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-green-300"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${(redirectCountdown / 5) * 125.6} 125.6`}
                      className="text-green-600 transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-green-800 font-bold text-lg">{redirectCountdown}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {error && !isCodeSent && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!isCodeSent && (
          <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="john@example.com"
            />
          </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
        )}

        {!isCodeSent && (
          <p className="mt-6 text-center text-sm text-gray-600">
            Remember your password?{' '}
            <Link to="/signin" className="text-blue-600 hover:underline">
              Sign In
            </Link>
          </p>
        )}
        
        {isCodeSent && (
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/reset-password', { state: { email } })}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              Go to reset page now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;