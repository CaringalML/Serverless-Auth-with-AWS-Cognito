const API_BASE_URL = process.env.REACT_APP_API_URL;

export const API_ENDPOINTS = {
  SIGNUP: `${API_BASE_URL}/auth/signup`,
  SIGNIN: `${API_BASE_URL}/auth/signin`,
  VERIFY: `${API_BASE_URL}/auth/verify`,
  FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
  RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
  RESEND_VERIFICATION: `${API_BASE_URL}/auth/resend-verification`,
  REFRESH: `${API_BASE_URL}/auth/refresh`,
  LOGOUT: `${API_BASE_URL}/auth/logout`,
  VERIFY_TOKEN: `${API_BASE_URL}/auth/verify-token`,
  USER_INFO: `${API_BASE_URL}/auth/user-info`,
};

export default API_BASE_URL;