// Simplified logging service - audit logging disabled
class LoggingService {
  constructor() {
    // Minimal initialization - no external API calls
    this.isEnabled = false; // Completely disabled
    this.sessionId = 'disabled';
    this.userId = null;
    this.userAgent = '';
    this.ipAddress = 'disabled';
    // No longer fetching IP address to avoid network calls
  }

  setUserId(userId) {
    this.userId = userId;
  }

  // User-friendly error messages mapping
  getUserFriendlyMessage(technicalError, context = '') {
    const errorMessages = {
      'No refresh token available': 'Your session has expired. Please sign in again.',
      'Invalid refresh token': 'Your session has expired. Please sign in again.',
      'Token expired': 'Your session has expired. Please sign in again.',
      'Network Error': 'Connection problem. Please check your internet and try again.',
      'Request timeout': 'The request took too long. Please try again.',
      'Server Error': 'Something went wrong on our end. Please try again later.',
      'Unauthorized': 'Please sign in to continue.',
      'Forbidden': 'You don\'t have permission to perform this action.',
      'Not Found': 'The requested resource was not found.',
      'Too Many Requests': 'Too many attempts. Please wait a moment and try again.',
      'Validation Error': 'Please check your input and try again.',
      'Connection refused': 'Unable to connect to the server. Please try again later.',
      'CORS error': 'Connection problem. Please try again.',
      'Parse error': 'Invalid response from server. Please try again.'
    };

    // Check for specific patterns
    if (technicalError.includes('refresh token') || technicalError.includes('token')) {
      return 'Your session has expired. Please sign in again.';
    }
    
    if (technicalError.includes('network') || technicalError.includes('Network')) {
      return 'Connection problem. Please check your internet and try again.';
    }

    if (technicalError.includes('timeout')) {
      return 'The request took too long. Please try again.';
    }

    // Look for exact matches
    for (const [key, message] of Object.entries(errorMessages)) {
      if (technicalError.includes(key)) {
        return message;
      }
    }

    // Default user-friendly message
    return 'Something went wrong. Please try again.';
  }

  // Log different types of events
  logUserActivity(action, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'USER_ACTIVITY',
      action,
      userId: this.userId,
      sessionId: this.sessionId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      details,
      url: window.location.href,
      referrer: document.referrer
    };

    this.sendLog(logEntry);
  }

  logError(error, context = '', userAction = '') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'ERROR',
      error: {
        message: error.message || error.toString(),
        stack: error.stack,
        code: error.code || 'UNKNOWN',
        name: error.name || 'Error'
      },
      context,
      userAction,
      userId: this.userId,
      sessionId: this.sessionId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      url: window.location.href,
      referrer: document.referrer
    };

    this.sendLog(logEntry);
  }

  logAuthEvent(event, success = true, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'AUTH_EVENT',
      event,
      success,
      userId: this.userId,
      sessionId: this.sessionId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      details,
      url: window.location.href
    };

    this.sendLog(logEntry);
  }

  logSecurityEvent(event, severity = 'medium', details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT',
      event,
      severity, // low, medium, high, critical
      userId: this.userId,
      sessionId: this.sessionId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      details,
      url: window.location.href
    };

    this.sendLog(logEntry);
  }

  logTokenEvent(event, tokenType = '', details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'TOKEN_EVENT',
      event,
      tokenType,
      userId: this.userId,
      sessionId: this.sessionId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      details,
      url: window.location.href
    };

    this.sendLog(logEntry);
  }

  logAPICall(method, url, statusCode, duration, error = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'API_CALL',
      method,
      url,
      statusCode,
      duration,
      success: statusCode < 400,
      error: error ? {
        message: error.message,
        code: error.code
      } : null,
      userId: this.userId,
      sessionId: this.sessionId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent
    };

    this.sendLog(logEntry);
  }

  async sendLog(logEntry) {
    // Disabled audit logging - no longer sending to backend
    // Only log to console in development for debugging
    if (process.env.NODE_ENV === 'development') {
      // Debug logging disabled for production
    }
    // Do not send logs to backend API
  }

  // Convenience methods for common scenarios
  logLogin(success, email, error = null) {
    this.logAuthEvent('LOGIN', success, {
      email: email ? email.substring(0, 3) + '***@' + email.split('@')[1] : undefined,
      errorMessage: error?.message
    });
  }

  logLogout(reason = 'user_initiated') {
    this.logAuthEvent('LOGOUT', true, { reason });
  }

  logSignup(success, email, error = null) {
    this.logAuthEvent('SIGNUP', success, {
      email: email ? email.substring(0, 3) + '***@' + email.split('@')[1] : undefined,
      errorMessage: error?.message
    });
  }

  logInactivityWarning() {
    this.logSecurityEvent('INACTIVITY_WARNING', 'medium', {
      timeUntilLogout: 300 // 5 minutes
    });
  }

  logInactivityLogout() {
    this.logSecurityEvent('INACTIVITY_LOGOUT', 'medium', {
      lastActivityTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    });
  }

  logTokenRefresh(success, error = null) {
    this.logTokenEvent('TOKEN_REFRESH', 'access_token', {
      success,
      errorMessage: error?.message,
      errorCode: error?.code
    });
  }

  logSuspiciousActivity(activity, details = {}) {
    this.logSecurityEvent('SUSPICIOUS_ACTIVITY', 'high', {
      activity,
      ...details
    });
  }
}

// Create singleton instance
const loggingService = new LoggingService();

export default loggingService;