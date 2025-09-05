import React, { useEffect } from 'react';

const RecaptchaProvider = ({ children }) => {
  // Get the site key from environment variable
  const reCaptchaSiteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;

  console.log('reCAPTCHA Site Key:', reCaptchaSiteKey ? 'Present' : 'Missing');

  useEffect(() => {
    // If reCAPTCHA is not configured, skip loading
    if (!reCaptchaSiteKey) {
      console.log('reCAPTCHA not configured - running without bot protection');
      return;
    }

    // Check if reCAPTCHA script is already loaded
    if (window.grecaptcha) {
      console.log('reCAPTCHA already loaded');
      return;
    }

    // Manually load reCAPTCHA script with proper configuration
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${reCaptchaSiteKey}`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('reCAPTCHA script loaded successfully');
      // Wait for grecaptcha to be available
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => {
          console.log('reCAPTCHA is ready!');
        });
      }
    };
    
    script.onerror = (error) => {
      console.error('Failed to load reCAPTCHA script:', error);
    };

    document.head.appendChild(script);

    // Cleanup function
    return () => {
      // Remove script if component unmounts
      const existingScript = document.querySelector(`script[src*="recaptcha/api.js"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [reCaptchaSiteKey]);

  return <>{children}</>;
};

export default RecaptchaProvider;