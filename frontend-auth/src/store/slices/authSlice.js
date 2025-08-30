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
  async ({ email, password, name }) => {
    const response = await authService.signup(email, password, name);
    return { ...response, email };
  }
);

export const verify = createAsyncThunk(
  'auth/verify',
  async ({ email, code }) => {
    const response = await authService.verify(email, code);
    return response;
  }
);

export const signin = createAsyncThunk(
  'auth/signin',
  async ({ email, password }) => {
    const response = await authService.signin(email, password);
    const userInfo = authService.getUserInfo();
    return { ...response, user: userInfo };
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async ({ email }) => {
    const response = await authService.forgotPassword(email);
    return { ...response, email };
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ email, code, newPassword }) => {
    const response = await authService.resetPassword(email, code, newPassword);
    return response;
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
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.loading = false;
        state.verificationEmail = action.payload.email;
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(verify.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verify.fulfilled, (state) => {
        state.loading = false;
        state.verificationEmail = null;
      })
      .addCase(verify.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(signin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signin.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(signin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.verificationEmail = action.payload.email;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
        state.verificationEmail = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { logout, clearError, checkAuth } = authSlice.actions;
export default authSlice.reducer;