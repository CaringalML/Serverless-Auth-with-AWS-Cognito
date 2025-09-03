import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/authService';

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  verificationEmail: null,
};

export const signup = createAsyncThunk(
  'auth/signup',
  async ({ email, password, name }, { rejectWithValue }) => {
    try {
      const response = await authService.signup(email, password, name);
      return { ...response, email };
    } catch (error) {
      return rejectWithValue(error.error || error.message || 'Sign up failed');
    }
  }
);

export const verify = createAsyncThunk(
  'auth/verify',
  async ({ email, code }, { rejectWithValue }) => {
    try {
      const response = await authService.verify(email, code);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || error.error || 'Verification failed');
    }
  }
);

export const signin = createAsyncThunk(
  'auth/signin',
  async ({ email, password }, { rejectWithValue, dispatch }) => {
    try {
      const response = await authService.signin(email, password);
      
      // Check if user info is already in the response, otherwise get it via API
      if (response.user) {
        return response;
      } else {
        // Try to get user info from httpOnly cookies after a small delay
        try {
          // Wait 200ms for cookies to be processed by browser
          await new Promise(resolve => setTimeout(resolve, 200));
          const userInfo = await authService.getUserInfo();
          return { ...response, user: userInfo };
        } catch (userInfoError) {
          // If getUserInfo fails, still return successful signin but without user data
          console.warn('Failed to get user info after signin:', userInfoError);
          return response;
        }
      }
    } catch (error) {
      // Extract error message from server response
      const errorMessage = error.error || error.message || 'Invalid email or password';
      return rejectWithValue(errorMessage);
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await authService.forgotPassword(email);
      return { ...response, email };
    } catch (error) {
      return rejectWithValue(error.error || error.message || 'Forgot password failed');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ email, code, newPassword }, { rejectWithValue }) => {
    try {
      const response = await authService.resetPassword(email, code, newPassword);
      return response;
    } catch (error) {
      return rejectWithValue(error.error || error.message || 'Reset password failed');
    }
  }
);

export const checkAuthAsync = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      // On page refresh, httpOnly cookies need extra time to be available
      // Add a delay to ensure cookies are readable by the browser
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const isAuth = await authService.isAuthenticated();
      
      if (isAuth) {
        const userInfo = await authService.getUserInfo();
        return { user: userInfo, isAuthenticated: true };
      } else {
        return { user: null, isAuthenticated: false };
      }
    } catch (error) {
      return rejectWithValue(error.error || error.message || 'Auth check failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      // Note: logout is now async, but we update state immediately
      authService.logout();
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    // Remove checkAuth sync reducer as auth checking is now async
  },
  extraReducers: (builder) => {
    builder
      .addCase(signup.pending, (state) => {
        state.loading = true;
        // Don't auto-clear error - let it persist for user to see
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.loading = false;
        state.verificationEmail = action.payload.email;
        state.error = null; // Clear error only on successful signup
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(verify.pending, (state) => {
        state.loading = true;
        // Don't auto-clear error - let it persist for user to see
      })
      .addCase(verify.fulfilled, (state) => {
        state.loading = false;
        state.verificationEmail = null;
        state.error = null; // Clear error only on successful verification
      })
      .addCase(verify.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(signin.pending, (state) => {
        state.loading = true;
        // Keep existing error visible during sign-in attempt
        // Error will only be cleared on success or replaced on failure
      })
      .addCase(signin.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user || null;
        state.isAuthenticated = true;
        state.error = null; // Clear error only on successful signin
      })
      .addCase(signin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        // Don't auto-clear error - let it persist for user to see
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.verificationEmail = action.payload.email;
        state.error = null; // Clear error only on successful request
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        // Don't auto-clear error - let it persist for user to see
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
        state.verificationEmail = null;
        state.error = null; // Clear error only on successful reset
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(checkAuthAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuthAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = action.payload.isAuthenticated;
        state.error = null;
      })
      .addCase(checkAuthAsync.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;