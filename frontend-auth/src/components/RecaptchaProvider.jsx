import React from 'react';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

const RecaptchaProvider = ({ children }) => {
  // Get the site key from environment variable
  const reCaptchaSiteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;

  console.log('reCAPTCHA Site Key:', reCaptchaSiteKey ? 'Present' : 'Missing');

  // If reCAPTCHA is not configured, just render children without the provider
  if (!reCaptchaSiteKey) {
    console.log('reCAPTCHA not configured - running without bot protection');
    return children;
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={reCaptchaSiteKey}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: 'head',
        nonce: undefined,
      }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
};

export default RecaptchaProvider;