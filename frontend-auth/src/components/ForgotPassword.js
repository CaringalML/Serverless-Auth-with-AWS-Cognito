import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { forgotPassword, clearError } from '../store/slices/authSlice';

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
    
    // Clear any previous server errors when attempting new submit
    if (error) {
      dispatch(clearError());
    }
    
    const result = await dispatch(forgotPassword({ email }));

    if (forgotPassword.fulfilled.match(result)) {
      setIsCodeSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-teal-500/10"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/3 right-1/3 w-48 h-48 bg-green-400/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
      
      <div className="relative bg-white/90 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-emerald-100/50 w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent mb-3">
            Reset Password
          </h2>
          <p className="text-emerald-600/70 font-medium">
            {isCodeSent ? 'Reset code sent successfully!' : "Enter your email and we'll send you a reset code"}
          </p>
        </div>
        
        {isCodeSent && (
          <div className="bg-gradient-to-r from-emerald-100/80 to-green-100/80 backdrop-blur border border-emerald-200/50 text-emerald-700 px-6 py-5 rounded-2xl mb-6 relative overflow-hidden shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-green-500/10"></div>
            <div className="relative flex items-center">
              <div className="p-2 bg-emerald-500/20 rounded-full mr-4">
                <svg className="w-6 h-6 text-emerald-700" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-bold text-xl text-emerald-800">Reset code sent!</p>
                <p className="text-sm mt-1 font-medium text-emerald-600">
                  Check your email for the reset code. Redirecting in{' '}
                  <span className="font-bold text-emerald-800 text-base">
                    {redirectCountdown}
                  </span>
                  {' '}second{redirectCountdown !== 1 ? 's' : ''}...
                </p>
              </div>
              <div className="ml-4">
                <div className="relative w-14 h-14">
                  <svg className="transform -rotate-90 w-14 h-14">
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-emerald-200"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${(redirectCountdown / 5) * 150.8} 150.8`}
                      className="text-emerald-600 transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-emerald-800 font-bold text-xl">{redirectCountdown}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {error && !isCodeSent && (
          <div className="bg-red-50/80 backdrop-blur border border-red-200/50 text-red-600 px-4 py-3 rounded-xl mb-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
              <button
                onClick={() => dispatch(clearError())}
                className="ml-4 text-red-400 hover:text-red-600 transition-colors duration-200"
                aria-label="Dismiss error"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {!isCodeSent && (
          <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-emerald-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-white/70 backdrop-blur border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:border-emerald-400 focus:ring-emerald-200 hover:border-emerald-300 transition-all duration-300 shadow-sm hover:shadow-md"
                placeholder="your.email@example.com"
              />
            </div>
          </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:from-emerald-700 hover:to-green-700 hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                  </svg>
                  Sending Reset Code...
                </div>
              ) : (
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                  Send Reset Code
                </span>
              )}
            </button>
          </form>
        )}

        {!isCodeSent && (
          <div className="mt-8 text-center">
            <p className="text-sm text-emerald-600/70">
              Remember your password?{' '}
              <Link to="/signin" className="font-semibold text-emerald-600 hover:text-emerald-800 transition-colors duration-200 hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        )}
        
        {isCodeSent && (
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/reset-password', { state: { email } })}
              className="px-6 py-2 bg-emerald-100/50 backdrop-blur border border-emerald-200 text-emerald-700 rounded-xl font-semibold hover:bg-emerald-200/50 hover:border-emerald-300 transition-all duration-300 shadow-sm hover:shadow-md"
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