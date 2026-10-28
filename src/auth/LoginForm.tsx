import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
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
  const loginInProgress = useRef(false);
  const isLoggingIn = loginStatus === "loading";
  const isRefreshingCaptcha = captchaStatus === "loading";

  useEffect(() => {
    void dispatch(loadCaptcha());
  }, [dispatch]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !salt ||
      isLoggingIn ||
      isRefreshingCaptcha ||
      loginInProgress.current
    ) {
      return;
    }

    loginInProgress.current = true;
    try {
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
    } finally {
      loginInProgress.current = false;
    }
  }

  function refreshCaptcha() {
    setCaptchaAnswer("");
    void dispatch(loadCaptcha());
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: { xs: 2, sm: 4 },
        background:
          "radial-gradient(circle at 16% 18%, rgba(18,107,102,.10), transparent 30%), #F4F7F6",
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          width: "min(100%, 980px)",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "0.9fr 1.1fr" },
          boxShadow: "0 24px 70px rgba(27, 63, 58, 0.10)",
        }}
      >
        <Box
          sx={{
            p: { xs: 3, sm: 5 },
            color: "common.white",
            bgcolor: "primary.dark",
            background: (currentTheme) =>
              `linear-gradient(145deg, ${currentTheme.palette.primary.dark} 0%, ${currentTheme.palette.primary.main} 100%)`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: { md: 570 },
          }}
        >
          <Stack spacing={4}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2.5,
                  bgcolor: "rgba(255,255,255,.14)",
                  display: "grid",
                  placeItems: "center",
                  border: "1px solid rgba(255,255,255,.2)",
                }}
              >
                <LockOutlinedIcon />
              </Box>
              <Box>
                <Typography variant="subtitle1" color="inherit">
                  IDICorp
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.72 }}>
                  SERVICE CONSOLE
                </Typography>
              </Box>
            </Stack>
            <Box>
              <Typography variant="overline" color="primary.light">
                Secure workspace
              </Typography>
              <Typography
                variant="h1"
                sx={{
                  mt: 1.5,
                  fontSize: { xs: "2rem", sm: "2.5rem" },
                  maxWidth: 380,
                }}
              >
                Your service tools, in one place.
              </Typography>
              <Typography sx={{ mt: 2, maxWidth: 360, color: "rgba(255,255,255,.76)" }}>
                Sign in to manage tasks and connect to IDICorp developer services.
              </Typography>
            </Box>
          </Stack>
          <Typography variant="caption" sx={{ mt: 5, color: "rgba(255,255,255,.62)" }}>
            Authorized access only
          </Typography>
        </Box>

        <Box sx={{ p: { xs: 3, sm: 5 }, alignSelf: "center" }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h2">Welcome back</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                Enter your account details to continue.
              </Typography>
            </Box>
            <Divider />
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.25}>
                <TextField
                  label="Username"
                  autoComplete="username"
                  required
                  fullWidth
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
                <TextField
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  required
                  fullWidth
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <Box>
                  <Stack
                    direction="row"
                    sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}
                  >
                    <Typography variant="subtitle1">Security check</Typography>
                    <Tooltip title="Get a new CAPTCHA">
                      <span>
                        <IconButton
                          aria-label="Refresh CAPTCHA"
                          onClick={refreshCaptcha}
                          disabled={isLoggingIn || isRefreshingCaptcha}
                          size="small"
                        >
                          <RefreshRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                  <Paper
                    variant="outlined"
                    sx={{
                      minHeight: 76,
                      p: 1.25,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "background.default",
                      overflow: "hidden",
                    }}
                  >
                    {captcha ? (
                      <Box
                        component="img"
                        src={captcha}
                        alt="Image-based CAPTCHA challenge"
                        sx={{ display: "block", maxWidth: "100%", height: 54, objectFit: "contain" }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {isRefreshingCaptcha ? "Loading CAPTCHA…" : "CAPTCHA unavailable"}
                      </Typography>
                    )}
                  </Paper>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                    The documented service provides an image challenge only; no alternate challenge is documented.
                  </Typography>
                </Box>
                <TextField
                  label="CAPTCHA answer"
                  autoComplete="off"
                  required
                  fullWidth
                  value={captchaAnswer}
                  onChange={(event) => setCaptchaAnswer(event.target.value)}
                />
                {captchaError && <Alert severity="error">{captchaError}</Alert>}
                {loginError && <Alert severity="error">{loginError}</Alert>}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  endIcon={
                    isLoggingIn ? (
                      <CircularProgress color="inherit" size={18} />
                    ) : (
                      <ArrowForwardRoundedIcon />
                    )
                  }
                  disabled={isLoggingIn || isRefreshingCaptcha || !salt}
                >
                  {isLoggingIn ? "Signing in" : "Sign in"}
                </Button>
                {isRefreshingCaptcha && (
                  <Typography
                    role="status"
                    variant="caption"
                    color="text.secondary"
                    sx={{ textAlign: "center" }}
                  >
                    Refreshing CAPTCHA…
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
