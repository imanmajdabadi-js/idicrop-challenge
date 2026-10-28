import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchCaptcha, submitLogin } from "./api";
import type { AuthStatus, LoginRequest } from "./types";

type AuthState = {
  captchaImage: string | null;
  salt: string | null;
  captchaStatus: AuthStatus;
  captchaError: string | null;
  loginStatus: AuthStatus;
  loginError: string | null;
  accessToken: string | null;
};

const initialState: AuthState = {
  captchaImage: null,
  salt: null,
  captchaStatus: "idle",
  captchaError: null,
  loginStatus: "idle",
  loginError: null,
  accessToken: null,
};

function getErrorMessage(error: object): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "The request could not be completed.";
}

export const loadCaptcha = createAsyncThunk(
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
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadCaptcha.pending, (state) => {
        state.captchaStatus = "loading";
        state.captchaError = null;
      })
      .addCase(loadCaptcha.fulfilled, (state, action) => {
        state.captchaStatus = "succeeded";
        state.captchaImage = action.payload.captcha_image;
        state.salt = action.payload.salt;
        state.captchaError = null;
      })
      .addCase(loadCaptcha.rejected, (state, action) => {
        state.captchaStatus = "failed";
        state.captchaError =
          typeof action.payload === "string"
            ? action.payload
            : "Unable to load the CAPTCHA.";
      })
      .addCase(login.pending, (state) => {
        state.loginStatus = "loading";
        state.loginError = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loginStatus = "succeeded";
        state.accessToken = action.payload.access_token;
        state.loginError = null;
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

export default authSlice.reducer;
