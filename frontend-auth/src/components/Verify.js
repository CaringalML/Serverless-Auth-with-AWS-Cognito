import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { verify } from '../store/slices/authSlice';
import authService from '../services/authService';

const Verify = () => {
  const location = useLocation();
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [email, setEmail] = useState(location.state?.email || '');
  const [isVerified, setIsVerified] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);
  const inputRefs = useRef([]);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isVerified) {
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
  }, [isVerified, navigate]);

  useEffect(() => {
    let interval = null;
    if (resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
    } else if (resendCountdown === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [resendCountdown]);

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return;
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (value && newCode.every(digit => digit !== '')) {
      handleAutoSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newCode = [...verificationCode];
    
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newCode[i] = pastedData[i];
    }
    
    setVerificationCode(newCode);
    
    // Auto-submit if all 6 digits are pasted
    if (pastedData.length === 6 && newCode.every(digit => digit !== '')) {
      handleAutoSubmit(newCode.join(''));
    } else {
      // Focus the next empty input or the last one
      const nextEmptyIndex = newCode.findIndex(code => code === '');
      if (nextEmptyIndex !== -1) {
        inputRefs.current[nextEmptyIndex]?.focus();
      } else {
        inputRefs.current[5]?.focus();
      }
    }
  };

  const handleAutoSubmit = async (code) => {
    if (loading || !email || code.length !== 6) return;
    
    const result = await dispatch(verify({
      email,
      code,
    }));

    if (verify.fulfilled.match(result)) {
      setIsVerified(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const code = verificationCode.join('');
    if (code.length !== 6) {
      return;
    }

    handleAutoSubmit(code);
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || !email) return;

    setResendLoading(true);
    setResendError('');
    setResendSuccess(false);

    try {
      await authService.resendVerification(email);
      setResendSuccess(true);
      setResendCountdown(60); // Start 60-second countdown
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setResendSuccess(false);
      }, 5000);
    } catch (error) {
      setResendError(error.error || 'Failed to resend verification code');
      if (error.remainingTime) {
        setResendCountdown(error.remainingTime);
      }
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">Verify Your Email</h2>
        <p className="text-center text-gray-600 mb-8">
          We've sent a verification code to your email address
        </p>
        
        {isVerified && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-4 rounded-lg mb-4 relative overflow-hidden">
            <div className="flex items-center">
              <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-lg">Email verified successfully!</p>
                <p className="text-sm mt-1">
                  Redirecting to sign in page in{' '}
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
                      strokeDasharray={`${(redirectCountdown / 3) * 125.6} 125.6`}
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
        
        {error && !isVerified && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {resendSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verification code sent successfully!
            </div>
          </div>
        )}

        {resendError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {resendError}
          </div>
        )}

        {!isVerified && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Verification Code
              </label>
              <div className="relative">
                <div className="flex justify-center space-x-2 mb-4">
                  {verificationCode.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className={`w-12 h-12 text-center text-lg font-semibold border-2 rounded-lg focus:outline-none transition-all ${
                        loading 
                          ? 'border-gray-200 bg-gray-50 text-gray-400' 
                          : 'border-gray-300 focus:border-blue-500'
                      }`}
                      maxLength="1"
                      pattern="[0-9]"
                      inputMode="numeric"
                      disabled={loading}
                    />
                  ))}
                </div>
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-lg">
                    <div className="flex flex-col items-center">
                      <svg className="animate-spin h-8 w-8 text-blue-600 mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm text-gray-600">Verifying...</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 text-center mb-4">
                {loading ? 'Please wait while we verify your code...' : 'Enter the 6-digit code sent to your email'}
              </p>
            </div>

            {/* Optional manual verify button for fallback */}
            {!loading && verificationCode.join('').length === 6 && (
              <div className="mt-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-gray-500">Having trouble?</span>
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-3 w-full text-sm text-gray-600 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium"
                >
                  Manually verify code
                </button>
              </div>
            )}
          </form>
        )}

        {!isVerified && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResend}
              disabled={resendCountdown > 0 || resendLoading}
              className={`text-sm font-medium transition-colors ${
                resendCountdown > 0 || resendLoading
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-blue-600 hover:text-blue-800 hover:underline'
              }`}
            >
              {resendLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : resendCountdown > 0 ? (
                `Resend code in ${resendCountdown}s`
              ) : (
                'Resend Code'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Verify;