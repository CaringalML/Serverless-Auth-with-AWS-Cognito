import { useCallback } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const useRecaptcha = () => {
  const { executeRecaptcha } = useGoogleReCaptcha();

  const getRecaptchaToken = useCallback(
    async (action = 'default') => {
      // If reCAPTCHA is not configured, return null
      if (!executeRecaptcha) {
        console.log('reCAPTCHA not available - continuing without token');
        return null;
      }

      // Check if reCAPTCHA is properly loaded
      if (!window.grecaptcha) {
        console.warn('reCAPTCHA not loaded - continuing without token');
        return null;
      }

      try {
        const token = await executeRecaptcha(action);
        
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