import { useCallback } from 'react';

const useRecaptcha = () => {

  const getRecaptchaToken = useCallback(
    async (action = 'default') => {
      console.log('getRecaptchaToken called with action:', action);
      
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

      const siteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
      if (!siteKey) {
        console.log('reCAPTCHA site key not configured - continuing without token');
        return null;
      }

      try {
        console.log('Executing reCAPTCHA with direct API...');
        
        // Use grecaptcha.ready to ensure reCAPTCHA is fully loaded and initialized
        const token = await new Promise((resolve, reject) => {
          window.grecaptcha.ready(() => {
            console.log('grecaptcha is ready, executing with site key:', siteKey);
            window.grecaptcha.execute(siteKey, { action })
              .then((token) => {
                console.log('Token from ready callback:', token ? 'Yes (length: ' + token.length + ')' : 'No');
                resolve(token);
              })
              .catch((error) => {
                console.log('Error in ready callback:', error);
                // Try without action as fallback
                console.log('Trying without action parameter...');
                window.grecaptcha.execute(siteKey)
                  .then((fallbackToken) => {
                    console.log('Fallback token:', fallbackToken ? 'Yes (length: ' + fallbackToken.length + ')' : 'No');
                    resolve(fallbackToken);
                  })
                  .catch((fallbackError) => {
                    console.log('Fallback error:', fallbackError);
                    resolve(null);
                  });
              });
          });
        });
        
        if (!token) {
          console.warn('reCAPTCHA token is empty - continuing without token');
          return null;
        }
        
        console.log('reCAPTCHA token generated successfully!');
        return token;
        
      } catch (error) {
        console.error('Error executing reCAPTCHA:', error);
        // Return null to allow form submission without reCAPTCHA
        // This provides better UX if reCAPTCHA fails
        return null;
      }
    },
    [] // No dependencies since we're using direct API
  );

  return { getRecaptchaToken };
};

export default useRecaptcha;