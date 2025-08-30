const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://your-api-gateway-url/dev';

export const API_ENDPOINTS = {
  SIGNUP: `${API_BASE_URL}/auth/signup`,
  SIGNIN: `${API_BASE_URL}/auth/signin`,
  VERIFY: `${API_BASE_URL}/auth/verify`,
  FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
  RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
};

export default API_BASE_URL;