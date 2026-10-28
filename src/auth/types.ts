export type AuthStatus = "idle" | "loading" | "succeeded" | "failed";

export type CaptchaResponse = {
  captcha_image: string;
  salt: string;
};

export type LoginRequest = {
  username: string;
  password: string;
  salt: string;
  captcha_answer: string;
};

export type LoginResponse = {
  access_token: string;
};
