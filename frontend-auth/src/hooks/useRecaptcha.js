import { useCallback } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const useRecaptcha = () => {
  const { executeRecaptcha } = useGoogleReCaptcha();

  const getRecaptchaToken = useCallback(
    async (action = 'default') => {
      console.log('getRecaptchaToken called with action:', action);
      console.log('executeRecaptcha function:', executeRecaptcha ? 'Available' : 'Not available');
      
      // If reCAPTCHA is not configured, return null
      if (!executeRecaptcha) {
        console.log('reCAPTCHA not available - continuing without token');
        return null;
      }

      // Check if reCAPTCHA is properly loaded
      console.log('window.grecaptcha:', window.grecaptcha ? 'Available' : 'Not available');
      if (window.grecaptcha) {
        console.log('grecaptcha methods:', Object.keys(window.grecaptcha));
        console.log('grecaptcha.execute available:', typeof window.grecaptcha.execute);
      }
      
      if (!window.grecaptcha) {
        console.warn('reCAPTCHA not loaded - continuing without token');
        return null;
      }

      try {
        console.log('Executing reCAPTCHA...');
        
        // Add a small delay to ensure reCAPTCHA is fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // First try the React wrapper
        let token = await executeRecaptcha(action);
        console.log('reCAPTCHA token (React wrapper):', token ? 'Yes (length: ' + token.length + ')' : 'No');
        
        // If React wrapper fails, try direct grecaptcha API
        if (!token && window.grecaptcha && window.grecaptcha.execute) {
          console.log('Trying direct grecaptcha API...');
          
          const siteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
          if (siteKey) {
            try {
              token = await window.grecaptcha.execute(siteKey, { action });
              console.log('reCAPTCHA token (direct API):', token ? 'Yes (length: ' + token.length + ')' : 'No');
            } catch (directError) {
              console.log('Direct API error:', directError);
              // Try without action as fallback
              try {
                token = await window.grecaptcha.execute(siteKey);
                console.log('reCAPTCHA token (direct API, no action):', token ? 'Yes (length: ' + token.length + ')' : 'No');
              } catch (fallbackError) {
                console.log('Direct API fallback error:', fallbackError);
              }
            }
          }
        }
        
        if (!token) {
          console.warn('reCAPTCHA token is empty - continuing without token');
          return null;
        }
        
        return token;
      } catch (error) {
        console.error('Error executing reCAPTCHA:', error);
        // Return null to allow form submission without reCAPTCHA
        // This provides better UX if reCAPTCHA fails
        return null;
      }
    },
    [executeRecaptcha]
  );

  return { getRecaptchaToken };
};

export default useRecaptcha;