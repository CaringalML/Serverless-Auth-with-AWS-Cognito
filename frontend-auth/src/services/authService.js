import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import loggingService from './loggingService';

class AuthService {
  constructor() {
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
    this._isAuthenticatedLocally = false; // Track auth state locally
    
    this.setupAxiosInterceptors();
    // Don't start activity tracking automatically - wait for successful login
  }

  /**
   * SECURE HTTPONLY COOKIE AUTHENTICATION SYSTEM
   * 
   * This service implements enterprise-grade authentication using httpOnly cookies
   * for maximum security against XSS and CSRF attacks.
   * 
   * Security Features:
   * - HttpOnly cookies prevent JavaScript access to tokens (XSS protection)
   * - SameSite=Strict prevents cross-site request forgery (CSRF protection) 
   * - Secure flag ensures cookies only sent over HTTPS
   * - Tokens stored server-side, never in browser memory/localStorage
   * 
   * Architecture:
   * - Frontend: https://filodelight.online (CloudFront)
   * - API: https://api.filodelight.online (API Gateway)
   * - Same root domain enables secure cookie sharing
   * 
   * Authentication Flow:
   * 1. User signs in → Server sets httpOnly cookies with tokens
   * 2. Browser automatically includes cookies in API requests
   * 3. Server validates tokens from cookies (invisible to JavaScript)
   * 4. Page refresh works seamlessly (cookies persist)
   */
  
  /**
   * Check authentication status by making API call
   * HttpOnly cookies are automatically included by browser
   */
  async checkAuthStatus() {
    try {
      const response = await axios.get(API_ENDPOINTS.VERIFY_TOKEN, { 
        withCredentials: true,
        timeout: 5000 
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  setupAxiosInterceptors() {
    axios.interceptors.request.use(
      (config) => {
        // Add timing metadata
        config.metadata = { startTime: Date.now() };
        
        // CRITICAL: Include httpOnly cookies in all API requests
        // This enables automatic token authentication without JavaScript access
        config.withCredentials = true;
        
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
        
        // Suppress URL logging for security
        // No API error logging to prevent URL exposure
        
        // Don't try to refresh tokens for authentication endpoints
        const isAuthEndpoint = originalRequest?.url?.includes('/auth/signin') || 
                              originalRequest?.url?.includes('/auth/signup') ||
                              originalRequest?.url?.includes('/auth/verify') ||
                              originalRequest?.url?.includes('/auth/forgot-password') ||
                              originalRequest?.url?.includes('/auth/reset-password') ||
                              originalRequest?.url?.includes('/auth/refresh');
        
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
          // AUTOMATIC TOKEN REFRESH USING HTTPONLY COOKIES
          // Backend automatically uses refresh token from httpOnly cookies
          
          originalRequest._retry = true;
          
          try {
            loggingService.logTokenEvent('REFRESH_ATTEMPT', 'access_token');
            await this.refreshAccessToken();
            loggingService.logTokenRefresh(true);
            
            // HttpOnly cookies automatically included - no manual token handling needed
            // Retry the original request with fresh tokens
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
      // Create clean error without axios details
      const cleanError = {
        error: error.response?.data?.error || 'Request failed',
        message: error.response?.data?.message || 'An error occurred'
      };
      throw cleanError;
    }
  }

  async signin(email, password) {
    try {
      loggingService.logUserActivity('SIGNIN_ATTEMPT', { email: email.substring(0, 3) + '***@' + email.split('@')[1] });
      
      const response = await axios.post(API_ENDPOINTS.SIGNIN, {
        email,
        password,
      }, {
        withCredentials: true  // Ensure cookies are included
      });
      
      
      // SUCCESS: Server has set secure httpOnly cookies with tokens
      // Tokens are invisible to JavaScript for maximum security
      
      // Set local auth state and start activity tracking after successful login
      this._isAuthenticatedLocally = true;
      this.updateLastActivity();
      this.startActivityTracking();
      this.startProactiveRefresh();
      
      // Log successful login
      loggingService.logLogin(true, email);
      
      return response.data;
    } catch (error) {
      // Create clean error without axios details to prevent URL exposure
      const status = error.response?.status;
      let errorMessage = 'Authentication failed';
      
      if (status === 401) {
        errorMessage = 'Invalid email or password';
      } else if (status === 403) {
        errorMessage = 'Account access denied';
      } else if (status === 404) {
        errorMessage = 'User not found';
      }
      
      const cleanError = new Error(errorMessage);
      cleanError.error = errorMessage;
      cleanError.message = errorMessage;
      
      throw cleanError;
    }
  }

  async forgotPassword(email) {
    try {
      const response = await axios.post(API_ENDPOINTS.FORGOT_PASSWORD, {
        email,
      });
      return response.data;
    } catch (error) {
      // Create clean error without axios details
      const cleanError = {
        error: error.response?.data?.error || 'Request failed',
        message: error.response?.data?.message || 'An error occurred'
      };
      throw cleanError;
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
      // Create clean error without axios details
      const cleanError = {
        error: error.response?.data?.error || 'Request failed',
        message: error.response?.data?.message || 'An error occurred'
      };
      throw cleanError;
    }
  }

  async resendVerification(email) {
    try {
      const response = await axios.post(API_ENDPOINTS.RESEND_VERIFICATION, {
        email,
      });
      return response.data;
    } catch (error) {
      // Create clean error without axios details
      const cleanError = {
        error: error.response?.data?.error || 'Request failed',
        message: error.response?.data?.message || 'An error occurred'
      };
      throw cleanError;
    }
  }

  /**
   * Check if user is authenticated using httpOnly cookies
   * 
   * SECURITY: Tokens are stored in httpOnly cookies and never accessible to JavaScript
   * This prevents XSS attacks from stealing authentication tokens
   * 
   * @returns {boolean} True if authenticated, false otherwise
   */
  async isAuthenticated() {
    try {
      // Extended timeout handles page refresh scenarios where cookies need time to be available
      const response = await axios.get(API_ENDPOINTS.VERIFY_TOKEN, {
        withCredentials: true,
        timeout: 5000
      });
      
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async logout() {
    try {
      // Log logout event
      loggingService.logLogout('user_initiated');
      
      // SECURE LOGOUT: Clear httpOnly cookies on server
      // This ensures tokens are completely removed from browser
      await axios.post(API_ENDPOINTS.LOGOUT, {}, {
        withCredentials: true
      });
      
      // Clear local auth state and stop tracking
      this._isAuthenticatedLocally = false;
      this.stopActivityTracking();
      this.stopProactiveRefresh();
      
      // Clear user ID from logging service
      loggingService.setUserId(null);
    } catch (error) {
      // Even if logout fails, clean up local state
      this.stopActivityTracking();
      this.stopProactiveRefresh();
      loggingService.setUserId(null);
    }
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

  /**
   * Get user information from server using httpOnly cookies
   * 
   * SECURITY: User data is retrieved using secure tokens from httpOnly cookies
   * No sensitive information is stored in browser memory
   * 
   * @returns {Object|null} User information or null if failed
   */
  async getUserInfo() {
    try {
      const response = await axios.get(API_ENDPOINTS.USER_INFO, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async refreshAccessToken() {
    // Prevent multiple simultaneous refresh requests
    if (this.isRefreshing) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    
    try {
      // AUTOMATIC REFRESH: Refresh token is automatically included via httpOnly cookies
      // Server validates refresh token and issues new access/id tokens securely
      this.refreshPromise = axios.post(API_ENDPOINTS.REFRESH, {}, {
        withCredentials: true,
        _retry: true  // Mark this request to skip interceptor retry logic
      });
      
      const response = await this.refreshPromise;
      
      // SUCCESS: New tokens automatically set in secure httpOnly cookies
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

  // With httpOnly cookies, we can't check token expiry from frontend
  // Let the backend handle token refresh automatically

  async checkAndRefreshToken() {
    // With httpOnly cookies, we'll let the axios interceptors handle token refresh
    // Just check if we're still authenticated
    try {
      const isAuth = await this.isAuthenticated();
      return isAuth;
    } catch (error) {
      // Failed to check authentication
      return false;
    }
  }

  startProactiveRefresh() {
    // Clear any existing interval
    if (this.proactiveRefreshInterval) {
      clearInterval(this.proactiveRefreshInterval);
    }
    
    // Check token every 5 minutes and refresh if needed (only if user is active)
    this.proactiveRefreshInterval = setInterval(async () => {
      if (this._isAuthenticatedLocally && !this.isRefreshing && this.isUserActive()) {
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
    if (!this._isAuthenticatedLocally) return;

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

    if (!this._isAuthenticatedLocally) return;

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
    
    this._isAuthenticatedLocally = false;
    this.stopActivityTracking();
    this.stopProactiveRefresh();
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