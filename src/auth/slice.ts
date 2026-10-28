import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchCaptcha, submitLogin } from "./api";
import type { AuthStatus, CaptchaResponse, LoginRequest } from "./types";

type AuthState = {
  captcha: string | null;
  salt: string | null;
  captchaStatus: AuthStatus;
  captchaError: string | null;
  loginStatus: AuthStatus;
  loginError: string | null;
  accessToken: string | null;
  captchaRequestId: string | null;
};

const initialState: AuthState = {
  captcha: null,
  salt: null,
  captchaStatus: "idle",
  captchaError: null,
  loginStatus: "idle",
  loginError: null,
  accessToken: null,
  captchaRequestId: null,
};

function getErrorMessage(error: object): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "The request could not be completed.";
}

export const loadCaptcha = createAsyncThunk<
  CaptchaResponse,
  void,
  { rejectValue: string }
>(
  "auth/loadCaptcha",
  async (_, { rejectWithValue }) => {
    try {
      return await fetchCaptcha();
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error instanceof Error ? error : new Error()),
      );
    }
  },
);

export const login = createAsyncThunk(
  "auth/login",
  async (request: LoginRequest, { rejectWithValue }) => {
    try {
      return await submitLogin(request);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error instanceof Error ? error : new Error()),
      );
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearSession: (state) => {
      state.accessToken = null;
      state.captcha = null;
      state.salt = null;
      state.captchaStatus = "idle";
      state.captchaError = null;
      state.loginStatus = "idle";
      state.loginError = null;
      state.captchaRequestId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCaptcha.pending, (state, action) => {
        state.captchaStatus = "loading";
        state.captchaError = null;
        state.captchaRequestId = action.meta.requestId;
      })
      .addCase(loadCaptcha.fulfilled, (state, action) => {
        if (state.captchaRequestId !== action.meta.requestId) {
          return;
        }

        state.captchaStatus = "succeeded";
        state.captcha = action.payload.captcha;
        state.salt = action.payload.salt;
        state.captchaError = null;
        state.captchaRequestId = null;
      })
      .addCase(loadCaptcha.rejected, (state, action) => {
        if (state.captchaRequestId !== action.meta.requestId) {
          return;
        }

        state.captchaStatus = "failed";
        state.captchaError =
          typeof action.payload === "string"
            ? action.payload
            : "Unable to load the CAPTCHA.";
        state.captchaRequestId = null;
      })
      .addCase(login.pending, (state) => {
        state.loginStatus = "loading";
        state.loginError = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loginStatus = "succeeded";
        state.accessToken = action.payload.access_token;
        state.loginError = null;
        state.captchaRequestId = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loginStatus = "failed";
        state.loginError =
          typeof action.payload === "string"
            ? action.payload
            : "Login failed. Check your credentials and CAPTCHA answer.";
      });
  },
});

export const { clearSession } = authSlice.actions;
export default authSlice.reducer;
