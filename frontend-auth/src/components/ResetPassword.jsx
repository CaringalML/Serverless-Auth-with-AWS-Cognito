import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { resetPassword } from '../store/slices/authSlice';
import { 
  validatePassword, 
  validatePasswordMatch,
  getPasswordStrength 
} from '../utils/validation';

const ResetPassword = () => {
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: location.state?.email || '',
    code: location.state?.code || '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [fieldErrors, setFieldErrors] = useState({
    newPassword: [],
    confirmPassword: '',
  });
  
  const [touched, setTouched] = useState({
    newPassword: false,
    confirmPassword: false,
  });
  
  const [passwordStrength, setPasswordStrength] = useState({ strength: 0, label: '', color: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    // Redirect if no email or code provided
    if (!location.state?.email || !location.state?.code || !location.state?.verified) {
      navigate('/forgot-password');
      return;
    }
    
    if (isSuccess) {
      const interval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            navigate('/signin');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isSuccess, navigate, location.state]);

  useEffect(() => {
    // Validate fields on change if they've been touched
    if (touched.newPassword) {
      const passwordValidation = validatePassword(formData.newPassword);
      setFieldErrors(prev => ({ ...prev, newPassword: passwordValidation.errors }));
      setPasswordStrength(getPasswordStrength(formData.newPassword));
    }
    
    if (touched.confirmPassword && formData.confirmPassword) {
      const matchValidation = validatePasswordMatch(formData.newPassword, formData.confirmPassword);
      setFieldErrors(prev => ({ ...prev, confirmPassword: matchValidation.error }));
    }
  }, [formData, touched]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setLocalError(''); // Clear local errors when user types
  };
  
  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Touch all fields to show validation
    setTouched({
      newPassword: true,
      confirmPassword: true,
    });
    
    // Validate all fields
    const passwordValidation = validatePassword(formData.newPassword);
    const matchValidation = validatePasswordMatch(formData.newPassword, formData.confirmPassword);
    
    if (!passwordValidation.isValid) {
      setLocalError('Please fix password requirements before continuing.');
      return;
    }
    
    if (!matchValidation.isValid) {
      setLocalError('Passwords do not match.');
      return;
    }

    const result = await dispatch(resetPassword({
      email: formData.email,
      code: formData.code,
      newPassword: formData.newPassword,
    }));

    if (resetPassword.fulfilled.match(result)) {
      setIsSuccess(true);
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
            Create your new password
          </p>
        </div>
        
        {isSuccess && (
          <div className="bg-gradient-to-r from-emerald-100/80 to-green-100/80 backdrop-blur border border-emerald-200/50 text-emerald-700 px-6 py-5 rounded-2xl mb-6 relative overflow-hidden shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-green-500/10"></div>
            <div className="relative flex items-center">
              <div className="p-2 bg-emerald-500/20 rounded-full mr-4">
                <svg className="w-6 h-6 text-emerald-700" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-bold text-xl text-emerald-800">Password reset successfully!</p>
                <p className="text-sm mt-1 font-medium text-emerald-600">
                  Redirecting to sign in page in{' '}
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
                      strokeDasharray={`${(redirectCountdown / 3) * 150.8} 150.8`}
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
        
        {(error || localError) && !isSuccess && (
          <div className="bg-red-50/80 backdrop-blur border border-red-200/50 text-red-600 px-4 py-3 rounded-xl mb-6 shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error || localError}
            </div>
          </div>
        )}

        {!isSuccess && (
        <div className="mb-6">
          <div className="bg-gradient-to-r from-emerald-100/80 to-green-100/80 backdrop-blur border border-emerald-200/50 text-emerald-700 px-6 py-4 rounded-2xl shadow-lg">
            <div className="flex items-center">
              <div className="p-2 bg-emerald-500/20 rounded-full mr-4">
                <svg className="w-5 h-5 text-emerald-700" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-emerald-800">Code Verified Successfully</p>
                <p className="text-sm text-emerald-600 mt-1">
                  Reset code verified for {formData.email}
                </p>
              </div>
            </div>
          </div>
        </div>
        )}
        
        {!isSuccess && (
        <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <label className="block text-sm font-semibold text-emerald-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                onBlur={() => handleBlur('newPassword')}
                required
                className={`w-full pl-10 pr-12 py-3 bg-white/70 backdrop-blur border rounded-xl focus:outline-none focus:ring-2 transition-all duration-300 shadow-sm hover:shadow-md ${
                  touched.newPassword && fieldErrors.newPassword.length > 0
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                    : 'border-emerald-200 focus:border-emerald-400 focus:ring-emerald-200 hover:border-emerald-300'
                }`}
                placeholder="Create a strong password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-500 hover:text-emerald-700 transition-colors"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* Password strength indicator */}
            {formData.newPassword && (
              <div className="mt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-emerald-600">Password strength:</span>
                  <span className={`text-xs font-semibold ${
                    passwordStrength.color === 'red' ? 'text-red-500' :
                    passwordStrength.color === 'yellow' ? 'text-yellow-500' :
                    passwordStrength.color === 'blue' ? 'text-blue-500' :
                    passwordStrength.color === 'green' ? 'text-emerald-600' : ''
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="h-2 bg-emerald-100/50 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={`h-full transition-all duration-500 ease-out ${
                      passwordStrength.strength === 1 ? 'w-1/4 bg-gradient-to-r from-red-400 to-red-500' :
                      passwordStrength.strength === 2 ? 'w-2/4 bg-gradient-to-r from-yellow-400 to-yellow-500' :
                      passwordStrength.strength === 3 ? 'w-3/4 bg-gradient-to-r from-blue-400 to-blue-500' :
                      passwordStrength.strength === 4 ? 'w-full bg-gradient-to-r from-emerald-400 to-emerald-500' : 'w-0'
                    }`}
                  />
                </div>
              </div>
            )}
            
            {/* Password requirements */}
            {touched.newPassword && fieldErrors.newPassword.length > 0 && (
              <div className="mt-3 p-3 bg-red-50/50 backdrop-blur border border-red-200/30 rounded-lg">
                <p className="text-xs font-medium text-emerald-700 mb-2">Password requirements:</p>
                <ul className="space-y-1">
                  {fieldErrors.newPassword.map((error, index) => (
                    <li key={index} className="text-red-500 flex items-start text-xs">
                      <svg className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-emerald-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={() => handleBlur('confirmPassword')}
                required
                className={`w-full pl-10 pr-12 py-3 bg-white/70 backdrop-blur border rounded-xl focus:outline-none focus:ring-2 transition-all duration-300 shadow-sm hover:shadow-md ${
                  touched.confirmPassword && fieldErrors.confirmPassword
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                    : formData.confirmPassword && formData.newPassword === formData.confirmPassword
                    ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-200'
                    : 'border-emerald-200 focus:border-emerald-400 focus:ring-emerald-200 hover:border-emerald-300'
                }`}
                placeholder="Confirm your new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-500 hover:text-emerald-700 transition-colors"
              >
                {showConfirmPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {touched.confirmPassword && fieldErrors.confirmPassword && (
              <p className="mt-2 text-xs text-red-500 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {fieldErrors.confirmPassword}
              </p>
            )}
            {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
              <p className="mt-2 text-xs text-emerald-600 flex items-center font-medium">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Passwords match perfectly
              </p>
            )}
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
                Resetting Password...
              </div>
            ) : (
              <span className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Reset Password
              </span>
            )}
          </button>
        </form>
        )}
        
        {isSuccess && (
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/signin')}
              className="px-6 py-2 bg-emerald-100/50 backdrop-blur border border-emerald-200 text-emerald-700 rounded-xl font-semibold hover:bg-emerald-200/50 hover:border-emerald-300 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              Go to sign in now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;