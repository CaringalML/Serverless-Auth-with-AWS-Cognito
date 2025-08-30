import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { signin, clearError } from '../store/slices/authSlice';
import { validateEmail } from '../utils/validation';

const SignIn = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    password: '',
  });
  
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState(null);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  // Track server errors separately from Redux state
  useEffect(() => {
    if (error && !serverError) {
      setServerError(error);
    }
  }, [error, serverError]);

  // Clear server error only when user successfully starts typing after seeing the error
  useEffect(() => {
    // Clear Redux error on component unmount to prevent it from showing on next visit
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  useEffect(() => {
    // Validate email on change if touched
    if (touched.email) {
      const emailValidation = validateEmail(formData.email);
      setFieldErrors(prev => ({ ...prev, email: emailValidation.error }));
    }
    
    // Simple password validation for sign in
    if (touched.password) {
      const passwordError = formData.password ? '' : 'Password is required';
      setFieldErrors(prev => ({ ...prev, password: passwordError }));
    }
  }, [formData, touched]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    
    // Only clear server error after user has made a meaningful change
    // This ensures the error stays visible until the user actually tries to fix it
    if (serverError && formData.email && formData.password) {
      // Clear server error only when both fields have values
      // This gives user time to see and understand the error
      setServerError(null);
      dispatch(clearError());
    }
  };
  
  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear any previous server errors when submitting
    setServerError(null);
    dispatch(clearError());
    
    // Touch all fields to show validation
    setTouched({
      email: true,
      password: true,
    });
    
    // Validate fields
    const emailValidation = validateEmail(formData.email);
    const passwordError = formData.password ? '' : 'Password is required';
    
    // Update field errors for display
    setFieldErrors({
      email: emailValidation.error,
      password: passwordError
    });
    
    if (!emailValidation.isValid || passwordError) {
      return;
    }
    
    const result = await dispatch(signin({
      email: formData.email,
      password: formData.password,
    }));

    if (signin.fulfilled.match(result)) {
      navigate('/dashboard');
    } else {
      // Set server error from the failed result
      setServerError(result.payload || 'Invalid email or password');
    }
  };

  // Use serverError if available, otherwise fall back to Redux error
  const displayError = serverError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `
            radial-gradient(circle at 25px 25px, rgba(16, 185, 129, 0.15) 2px, transparent 2px),
            radial-gradient(circle at 75px 75px, rgba(5, 150, 105, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px, 50px 50px'
        }}></div>
        {/* Decorative shapes */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-200/20 rounded-full blur-3xl"></div>
      </div>
      
      {/* Main Card */}
      <div className="bg-white/90 backdrop-blur-lg p-10 rounded-3xl shadow-2xl w-full max-w-md relative border border-white/20">
        {/* Decorative top accent */}
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600 rounded-full"></div>
        
        {/* Header */}
        <div className="text-center mb-10 relative">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl mb-6 shadow-xl transform hover:scale-105 transition-transform duration-300">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent mb-3">Welcome Back</h2>
          <p className="text-gray-600 font-medium text-lg">Sign in to your account</p>
        </div>
        
        {displayError && (
          <div className="bg-red-50/80 backdrop-blur border border-red-200/50 text-red-600 px-4 py-3 rounded-xl mb-6 shadow-sm">
            <div className="flex items-center justify-content-between">
              <div className="flex items-center flex-1">
                <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{displayError}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setServerError(null);
                  dispatch(clearError());
                }}
                className="ml-3 text-red-400 hover:text-red-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="relative">
            <label className="flex items-center text-sm font-bold text-gray-700 mb-4">
              <div className="w-6 h-6 bg-gradient-to-r from-emerald-400 to-green-500 rounded-lg mr-3 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              Email Address
            </label>
            <div className="relative group">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={() => handleBlur('email')}
                className={`w-full px-6 py-4 bg-white/70 border-2 rounded-2xl transition-all duration-300 focus:outline-none backdrop-blur-sm text-gray-800 font-medium placeholder-gray-400 ${
                  touched.email && fieldErrors.email 
                    ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 bg-red-50/50' 
                    : 'border-emerald-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 hover:border-emerald-300 group-hover:shadow-lg'
                }`}
                placeholder="Enter your email address"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-50/50 via-transparent to-green-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
            {touched.email && fieldErrors.email && (
              <div className="mt-3 flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-xl">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {fieldErrors.email}
              </div>
            )}
          </div>

          <div className="relative">
            <label className="flex items-center text-sm font-bold text-gray-700 mb-4">
              <div className="w-6 h-6 bg-gradient-to-r from-emerald-400 to-green-500 rounded-lg mr-3 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              Password
            </label>
            <div className="relative group">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={() => handleBlur('password')}
                className={`w-full px-6 py-4 pr-14 bg-white/70 border-2 rounded-2xl transition-all duration-300 focus:outline-none backdrop-blur-sm text-gray-800 font-medium placeholder-gray-400 ${
                  touched.password && fieldErrors.password
                    ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 bg-red-50/50' 
                    : 'border-emerald-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 hover:border-emerald-300 group-hover:shadow-lg'
                }`}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-400 hover:text-emerald-600 transition-colors duration-200"
              >
                {showPassword ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-50/50 via-transparent to-green-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
            {touched.password && fieldErrors.password && (
              <div className="mt-3 flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-xl">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {fieldErrors.password}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4">
            <Link
              to="/forgot-password"
              className="text-sm font-semibold text-gray-600 hover:text-emerald-600 transition-colors duration-200 relative group"
            >
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Forgot Password?
              </span>
              <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-500 transition-all duration-300 group-hover:w-full"></div>
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-10 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-600 hover:via-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-5 px-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl disabled:scale-100 disabled:shadow-none disabled:cursor-not-allowed relative overflow-hidden text-lg"
          >
            <div className="flex items-center justify-center">
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing In...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In
                </>
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 translate-x-[-100%] hover:translate-x-[100%] transition-all duration-700"></div>
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-gray-200/50">
          <p className="text-center text-gray-600 text-lg">
            Don't have an account?{' '}
            <Link to="/signup" className="font-bold text-emerald-600 hover:text-green-700 transition-colors duration-200 relative group">
              Create Account
              <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-500 transition-all duration-300 group-hover:w-full"></div>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;