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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-teal-500/10"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/3 right-1/3 w-48 h-48 bg-green-400/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
      
      <div className="relative bg-white/90 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-emerald-100/50 w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent mb-3">
            Verify Your Email
          </h2>
          <p className="text-emerald-600/70 font-medium">
            Enter the verification code sent to your email
          </p>
        </div>
        
        {isVerified && (
          <div className="bg-gradient-to-r from-emerald-100/80 to-green-100/80 backdrop-blur border border-emerald-200/50 text-emerald-700 px-6 py-5 rounded-2xl mb-6 relative overflow-hidden shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-green-500/10"></div>
            <div className="relative flex items-center">
              <div className="p-2 bg-emerald-500/20 rounded-full mr-4">
                <svg className="w-6 h-6 text-emerald-700" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-bold text-xl text-emerald-800">Email verified successfully!</p>
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
        
        {error && !isVerified && (
          <div className="bg-red-50/80 backdrop-blur border border-red-200/50 text-red-600 px-4 py-3 rounded-xl mb-6 shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {resendSuccess && (
          <div className="bg-emerald-50/80 backdrop-blur border border-emerald-200/50 text-emerald-700 px-4 py-3 rounded-xl mb-6 shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verification code sent successfully!
            </div>
          </div>
        )}

        {resendError && (
          <div className="bg-red-50/80 backdrop-blur border border-red-200/50 text-red-600 px-4 py-3 rounded-xl mb-6 shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {resendError}
            </div>
          </div>
        )}

        {!isVerified && (
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

            <div>
              <label className="block text-sm font-semibold text-emerald-700 mb-4">
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
                      className={`w-12 h-12 text-center text-lg font-bold border-2 rounded-xl focus:outline-none transition-all duration-300 shadow-sm hover:shadow-md backdrop-blur ${
                        loading 
                          ? 'border-emerald-200/50 bg-gray-50/70 text-gray-400' 
                          : 'border-emerald-200 bg-white/70 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 hover:border-emerald-300 text-emerald-800'
                      }`}
                      maxLength="1"
                      pattern="[0-9]"
                      inputMode="numeric"
                      disabled={loading}
                    />
                  ))}
                </div>
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur rounded-xl">
                    <div className="flex flex-col items-center">
                      <svg className="animate-spin h-8 w-8 text-emerald-600 mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm text-emerald-700 font-medium">Verifying...</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-emerald-600/70 text-center mb-4 font-medium">
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
                  className="mt-3 w-full text-sm text-emerald-600 py-3 px-4 border border-emerald-200 bg-white/70 backdrop-blur rounded-xl hover:bg-emerald-50/70 hover:border-emerald-300 transition-all duration-300 font-semibold shadow-sm hover:shadow-md"
                >
                  Manually verify code
                </button>
              </div>
            )}
          </form>
        )}

        {!isVerified && (
          <div className="mt-6 text-center">
            <p className="text-sm text-emerald-600/70 mb-3 font-medium">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResend}
              disabled={resendCountdown > 0 || resendLoading}
              className={`text-sm font-semibold transition-all duration-200 ${
                resendCountdown > 0 || resendLoading
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-emerald-600 hover:text-emerald-800 hover:underline'
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