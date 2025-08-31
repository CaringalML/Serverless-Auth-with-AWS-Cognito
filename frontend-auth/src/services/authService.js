import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import loggingService from './loggingService';

class AuthService {
  constructor() {
    this.token = this.getTokenFromCookie();
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.lastActivityTime = Date.now();
    this.inactivityTimeout = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    this.warningTimeout = 5 * 60 * 1000; // Show warning 5 minutes before logout
    this.activityCheckInterval = null;
    this.warningTimer = null;
    this.logoutTimer = null;
    this.proactiveRefreshInterval = null; // Track the refresh interval
    this.onInactivityWarning = null;
    this.onInactivityLogout = null;
    
    this.cleanupLocalStorage(); // Clean up any old localStorage tokens
    this.setupAxiosInterceptors();
    this.startActivityTracking();
    this.startProactiveRefresh();
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
        // Add timing metadata
        config.metadata = { startTime: Date.now() };
        
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
      (response) => {
        // Log successful API calls
        const duration = response.config.metadata?.startTime ? 
          Date.now() - response.config.metadata.startTime : 0;
        loggingService.logAPICall(
          response.config.method.toUpperCase(),
          response.config.url,
          response.status,
          duration
        );
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        // Log API errors - check if originalRequest exists
        if (originalRequest) {
          const duration = originalRequest.metadata?.startTime ? 
            Date.now() - originalRequest.metadata.startTime : 0;
          loggingService.logAPICall(
            originalRequest.method?.toUpperCase() || 'UNKNOWN',
            originalRequest.url || 'unknown',
            error.response?.status || 0,
            duration,
            error
          );
        }
        
        // Don't try to refresh tokens for authentication endpoints
        const isAuthEndpoint = originalRequest?.url?.includes('/auth/signin') || 
                              originalRequest?.url?.includes('/auth/signup') ||
                              originalRequest?.url?.includes('/auth/verify') ||
                              originalRequest?.url?.includes('/auth/forgot-password') ||
                              originalRequest?.url?.includes('/auth/reset-password') ||
                              originalRequest?.url?.includes('/auth/refresh');
        
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
          // Only try refresh if we have a refresh token
          const refreshToken = this.getRefreshToken();
          if (!refreshToken) {
            // Log token refresh failure
            loggingService.logTokenEvent('REFRESH_FAILED', 'refresh_token', {
              reason: 'No refresh token available',
              url: originalRequest.url
            });
            
            // Silent logout - don't show technical error to user
            this.logout();
            window.location.href = '/signin';
            
            // Return user-friendly error
            const userError = new Error(loggingService.getUserFriendlyMessage('No refresh token available'));
            return Promise.reject(userError);
          }
          
          originalRequest._retry = true;
          
          try {
            loggingService.logTokenEvent('REFRESH_ATTEMPT', 'access_token');
            await this.refreshAccessToken();
            loggingService.logTokenRefresh(true);
            
            // Update the authorization header with new token
            originalRequest.headers.Authorization = `Bearer ${this.getToken()}`;
            // Retry the original request
            return axios(originalRequest);
          } catch (refreshError) {
            // Log refresh failure
            loggingService.logTokenRefresh(false, refreshError);
            
            // Silent logout
            this.logout();
            window.location.href = '/signin';
            
            // Return user-friendly error
            const userError = new Error(loggingService.getUserFriendlyMessage(refreshError.message));
            return Promise.reject(userError);
          }
        }
        
        // For other errors, return user-friendly message but log the technical details
        if (originalRequest) {
          loggingService.logError(error, 'API_CALL', originalRequest.url);
        }
        
        // Return original error for auth endpoints to show proper validation messages
        if (isAuthEndpoint) {
          return Promise.reject(error);
        }
        
        // For other endpoints, return user-friendly error
        const userFriendlyError = new Error(loggingService.getUserFriendlyMessage(error.message || error.toString()));
        return Promise.reject(userFriendlyError);
      }
    );
  }

  async signup(email, password, name) {
    try {
      loggingService.logUserActivity('SIGNUP_ATTEMPT', { 
        email: email.substring(0, 3) + '***@' + email.split('@')[1],
        name: name.substring(0, 1) + '***'
      });
      
      const response = await axios.post(API_ENDPOINTS.SIGNUP, {
        email,
        password,
        name,
      });
      
      // Log successful signup
      loggingService.logSignup(true, email);
      
      return response.data;
    } catch (error) {
      // Log failed signup
      loggingService.logSignup(false, email, error.response?.data || error);
      
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
      loggingService.logUserActivity('SIGNIN_ATTEMPT', { email: email.substring(0, 3) + '***@' + email.split('@')[1] });
      
      const response = await axios.post(API_ENDPOINTS.SIGNIN, {
        email,
        password,
      });
      
      if (response.data.accessToken) {
        this.setToken(response.data.accessToken);
        this.setRefreshToken(response.data.refreshToken);
        this.setIdToken(response.data.idToken);
        
        // Set user ID for logging
        const userInfo = this.getUserInfo();
        loggingService.setUserId(userInfo?.sub || userInfo?.email);
        
        // Start activity tracking after successful login
        this.updateLastActivity();
        this.startActivityTracking();
        
        // Log successful login
        loggingService.logLogin(true, email);
      }
      
      return response.data;
    } catch (error) {
      // Log failed login attempt
      loggingService.logLogin(false, email, error.response?.data || error);
      
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
    // Log logout event
    loggingService.logLogout('user_initiated');
    
    this.token = null;
    // Clear cookies
    this.deleteCookie('accessToken');
    this.deleteCookie('refreshToken');
    this.deleteCookie('idToken');
    // Stop activity tracking
    this.stopActivityTracking();
    // Stop proactive refresh
    this.stopProactiveRefresh();
    
    // Clear user ID from logging service
    loggingService.setUserId(null);
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

  async refreshAccessToken() {
    // Prevent multiple simultaneous refresh requests
    if (this.isRefreshing) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      const error = new Error('No refresh token available - user needs to login again');
      error.code = 'NO_REFRESH_TOKEN';
      throw error;
    }

    this.isRefreshing = true;
    
    try {
      this.refreshPromise = axios.post(API_ENDPOINTS.REFRESH, {
        refreshToken: refreshToken
      }, {
        _retry: true  // Mark this request to skip interceptor retry logic
      });
      
      const response = await this.refreshPromise;
      
      if (response.data.accessToken) {
        this.setToken(response.data.accessToken);
        if (response.data.idToken) {
          this.setIdToken(response.data.idToken);
        }
      }
      
      return response.data;
    } catch (error) {
      // Don't call logout here - let the interceptor handle it
      // to avoid double logout
      throw error;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  isTokenExpiringSoon(token, minutesBeforeExpiry = 5) {
    if (!token) return true;
    
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return true;
      
      const now = Math.floor(Date.now() / 1000);
      const expiry = decoded.exp;
      const timeUntilExpiry = expiry - now;
      
      return timeUntilExpiry < (minutesBeforeExpiry * 60);
    } catch (error) {
      return true;
    }
  }

  async checkAndRefreshToken() {
    const accessToken = this.getToken();
    
    if (this.isTokenExpiringSoon(accessToken)) {
      try {
        await this.refreshAccessToken();
        return true;
      } catch (error) {
        console.error('Failed to refresh token:', error);
        return false;
      }
    }
    
    return true;
  }

  startProactiveRefresh() {
    // Clear any existing interval
    if (this.proactiveRefreshInterval) {
      clearInterval(this.proactiveRefreshInterval);
    }
    
    // Check token every 5 minutes and refresh if needed (only if user is active)
    this.proactiveRefreshInterval = setInterval(async () => {
      if (this.isAuthenticated() && !this.isRefreshing && this.isUserActive()) {
        await this.checkAndRefreshToken();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  stopProactiveRefresh() {
    if (this.proactiveRefreshInterval) {
      clearInterval(this.proactiveRefreshInterval);
      this.proactiveRefreshInterval = null;
    }
  }

  // Activity tracking methods
  updateLastActivity() {
    this.lastActivityTime = Date.now();
    this.resetInactivityTimers();
    
    // Log user activity periodically (every 5 minutes)
    const now = Date.now();
    if (!this.lastActivityLog || now - this.lastActivityLog > 5 * 60 * 1000) {
      loggingService.logUserActivity('USER_ACTIVE', {
        page: window.location.pathname,
        timestamp: new Date().toISOString()
      });
      this.lastActivityLog = now;
    }
  }

  isUserActive() {
    const timeSinceLastActivity = Date.now() - this.lastActivityTime;
    return timeSinceLastActivity < this.inactivityTimeout;
  }

  getTimeUntilInactive() {
    const timeSinceLastActivity = Date.now() - this.lastActivityTime;
    return Math.max(0, this.inactivityTimeout - timeSinceLastActivity);
  }

  startActivityTracking() {
    if (!this.isAuthenticated()) return;

    // Track user activity events
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const activityHandler = () => {
      this.updateLastActivity();
    };

    // Add activity listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, activityHandler, { passive: true });
    });

    // Store reference to remove listeners later
    this.activityHandler = activityHandler;
    this.activityEvents = activityEvents;

    // Set initial timers
    this.resetInactivityTimers();
  }

  stopActivityTracking() {
    if (this.activityHandler && this.activityEvents) {
      this.activityEvents.forEach(event => {
        document.removeEventListener(event, this.activityHandler);
      });
    }

    // Clear all timers
    if (this.warningTimer) clearTimeout(this.warningTimer);
    if (this.logoutTimer) clearTimeout(this.logoutTimer);
    if (this.activityCheckInterval) clearInterval(this.activityCheckInterval);
  }

  resetInactivityTimers() {
    // Clear existing timers
    if (this.warningTimer) clearTimeout(this.warningTimer);
    if (this.logoutTimer) clearTimeout(this.logoutTimer);

    if (!this.isAuthenticated()) return;

    // Set warning timer (5 minutes before logout)
    this.warningTimer = setTimeout(() => {
      // Log inactivity warning
      loggingService.logInactivityWarning();
      
      if (this.onInactivityWarning) {
        this.onInactivityWarning(this.warningTimeout / 1000); // Pass seconds until logout
      }
    }, this.inactivityTimeout - this.warningTimeout);

    // Set logout timer
    this.logoutTimer = setTimeout(() => {
      this.handleInactivityLogout();
    }, this.inactivityTimeout);
  }

  handleInactivityLogout() {
    // Log inactivity logout
    loggingService.logInactivityLogout();
    
    if (this.onInactivityLogout) {
      this.onInactivityLogout();
    }
    
    // Use specific logout reason
    loggingService.logLogout('inactivity_timeout');
    
    this.token = null;
    this.deleteCookie('accessToken');
    this.deleteCookie('refreshToken');
    this.deleteCookie('idToken');
    this.stopActivityTracking();
    loggingService.setUserId(null);
    
    // Redirect to login page
    if (window.location.pathname !== '/signin') {
      window.location.href = '/signin?reason=inactivity';
    }
  }

  // Event handlers for UI components to hook into
  setInactivityWarningCallback(callback) {
    this.onInactivityWarning = callback;
  }

  setInactivityLogoutCallback(callback) {
    this.onInactivityLogout = callback;
  }

  // Extend session (called when user responds to warning)
  extendSession() {
    this.updateLastActivity();
  }
}

const authService = new AuthService();
export default authService;