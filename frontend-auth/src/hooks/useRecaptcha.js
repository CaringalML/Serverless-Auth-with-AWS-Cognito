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
      if (!window.grecaptcha) {
        console.warn('reCAPTCHA not loaded - continuing without token');
        return null;
      }

      try {
        console.log('Executing reCAPTCHA...');
        const token = await executeRecaptcha(action);
        console.log('reCAPTCHA token received:', token ? 'Yes (length: ' + token.length + ')' : 'No');
        
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