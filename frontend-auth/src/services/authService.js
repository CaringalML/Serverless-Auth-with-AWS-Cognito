import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

class AuthService {
  constructor() {
    this.token = this.getTokenFromCookie();
    this.cleanupLocalStorage(); // Clean up any old localStorage tokens
    this.setupAxiosInterceptors();
  }

  // Cookie utility methods
  setCookie(name, value, days = 7) {
    const maxAge = days * 24 * 60 * 60; // Convert days to seconds
    let cookieString = `${name}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Strict`;
    
    // Add Secure flag for HTTPS
    if (window.location.protocol === 'https:') {
      cookieString += '; Secure';
    }
    
    document.cookie = cookieString;
  }

  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
  }

  getTokenFromCookie() {
    return this.getCookie('accessToken');
  }

  cleanupLocalStorage() {
    // Remove any old localStorage tokens from previous versions
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('idToken');
    } catch (e) {
      // Ignore errors if localStorage is not available
    }
  }

  setupAxiosInterceptors() {
    axios.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/signin';
        }
        return Promise.reject(error);
      }
    );
  }

  async signup(email, password, name) {
    try {
      const response = await axios.post(API_ENDPOINTS.SIGNUP, {
        email,
        password,
        name,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  async verify(email, code) {
    try {
      const response = await axios.post(API_ENDPOINTS.VERIFY, {
        email,
        code,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  async signin(email, password) {
    try {
      const response = await axios.post(API_ENDPOINTS.SIGNIN, {
        email,
        password,
      });
      
      if (response.data.accessToken) {
        this.setToken(response.data.accessToken);
        this.setRefreshToken(response.data.refreshToken);
        this.setIdToken(response.data.idToken);
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  async forgotPassword(email) {
    try {
      const response = await axios.post(API_ENDPOINTS.FORGOT_PASSWORD, {
        email,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  async resetPassword(email, code, newPassword) {
    try {
      const response = await axios.post(API_ENDPOINTS.RESET_PASSWORD, {
        email,
        code,
        newPassword,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  async resendVerification(email) {
    try {
      const response = await axios.post(API_ENDPOINTS.RESEND_VERIFICATION, {
        email,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  setToken(token) {
    this.token = token;
    this.setCookie('accessToken', token, 7); // 7 days
  }

  setRefreshToken(token) {
    this.setCookie('refreshToken', token, 30); // 30 days for refresh token
  }

  setIdToken(token) {
    this.setCookie('idToken', token, 7); // 7 days
  }

  getToken() {
    return this.token || this.getCookie('accessToken');
  }

  getRefreshToken() {
    return this.getCookie('refreshToken');
  }

  getIdToken() {
    return this.getCookie('idToken');
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  logout() {
    this.token = null;
    // Clear cookies
    this.deleteCookie('accessToken');
    this.deleteCookie('refreshToken');
    this.deleteCookie('idToken');
  }

  decodeToken(token) {
    if (!token) return null;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  }

  getUserInfo() {
    const idToken = this.getIdToken();
    return this.decodeToken(idToken);
  }
}

const authService = new AuthService();
export default authService;