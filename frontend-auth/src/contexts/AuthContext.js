import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Optimized delay to allow KMS-encrypted cookies to be fully processed
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (await authService.isAuthenticated()) {
        const userInfo = await authService.getUserInfo();
        setUser(userInfo);
      }
    } catch (error) {
      // Auth check failed
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email, password, name) => {
    try {
      setError(null);
      const response = await authService.signup(email, password, name);
      return response;
    } catch (error) {
      setError(error.error || 'Signup failed');
      throw error;
    }
  };

  const verify = async (email, code) => {
    try {
      setError(null);
      const response = await authService.verify(email, code);
      return response;
    } catch (error) {
      setError(error.error || 'Verification failed');
      throw error;
    }
  };

  const signin = async (email, password) => {
    try {
      setError(null);
      const response = await authService.signin(email, password);
      
      // Optimized delay to ensure KMS-encrypted cookies are fully processed
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const userInfo = await authService.getUserInfo();
      setUser(userInfo);
      return response;
    } catch (error) {
      setError(error.error || 'Signin failed');
      throw error;
    }
  };

  const forgotPassword = async (email) => {
    try {
      setError(null);
      const response = await authService.forgotPassword(email);
      return response;
    } catch (error) {
      setError(error.error || 'Password reset request failed');
      throw error;
    }
  };

  const resetPassword = async (email, code, newPassword) => {
    try {
      setError(null);
      const response = await authService.resetPassword(email, code, newPassword);
      return response;
    } catch (error) {
      setError(error.error || 'Password reset failed');
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    error,
    signup,
    verify,
    signin,
    forgotPassword,
    resetPassword,
    logout,
    isAuthenticated: !!user, // Use user state instead of service call
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};