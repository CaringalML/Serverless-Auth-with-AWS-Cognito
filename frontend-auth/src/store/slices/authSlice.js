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
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await authService.signin(email, password);
      const userInfo = authService.getUserInfo();
      return { ...response, user: userInfo };
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

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      authService.logout();
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    checkAuth: (state) => {
      if (authService.isAuthenticated()) {
        const userInfo = authService.getUserInfo();
        state.user = userInfo;
        state.isAuthenticated = true;
      }
    },
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
        state.user = action.payload.user;
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
      });
  },
});

export const { logout, clearError, checkAuth } = authSlice.actions;
export default authSlice.reducer;