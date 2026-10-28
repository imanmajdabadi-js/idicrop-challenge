import { FormEvent, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { loadCaptcha, login } from "./slice";

export default function LoginForm() {
  const dispatch = useAppDispatch();
  const {
    captcha,
    salt,
    captchaStatus,
    captchaError,
    loginStatus,
    loginError,
  } = useAppSelector((state) => state.auth);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  useEffect(() => {
    void dispatch(loadCaptcha());
  }, [dispatch]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!salt) {
      return;
    }

    const result = await dispatch(
      login({
        username,
        password,
        salt,
        captcha_answer: captchaAnswer,
      }),
    );

    if (login.rejected.match(result)) {
      void dispatch(loadCaptcha());
      setCaptchaAnswer("");
    }
  }

  const isLoggingIn = loginStatus === "loading";
  const isRefreshingCaptcha = captchaStatus === "loading";

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Username
        <input
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </label>
      <label>
        Password
        <input
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {captcha ? (
        <img src={captcha} alt="CAPTCHA" />
      ) : (
        <p>CAPTCHA unavailable.</p>
      )}
      <label>
        CAPTCHA answer
        <input
          required
          value={captchaAnswer}
          onChange={(event) => setCaptchaAnswer(event.target.value)}
        />
      </label>
      {captchaError && <p role="alert">{captchaError}</p>}
      {loginError && <p role="alert">{loginError}</p>}
      <button disabled={isLoggingIn || isRefreshingCaptcha || !salt}>
        {isLoggingIn ? "Signing in..." : "Sign in"}
      </button>
      {isRefreshingCaptcha && <p>Refreshing CAPTCHA...</p>}
    </form>
  );
}
