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
            position: "relative",
            p: { xs: 0, sm: 0, md: 0 },
            color: "common.white",
            display: "flex",
            flexDirection: "column",
            justifyContent: "stretch",
            minHeight: { xs: 200, sm: 240, md: 620 },
            overflow: "hidden",
          }}
        >
          <Box
            aria-hidden="true"
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg, #041412 0%, #0a2f2b 100%)",
            }}
          />
          <Box
            component="img"
            src="/images/img-2.png"
            alt="IDICorp service console visual"
            sx={{
              position: "relative",
              zIndex: 1,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              filter: "contrast(1.01) saturate(1.03)",
            }}
          />
          <Box
            aria-hidden="true"
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, transparent 0%, rgba(4, 20, 18, 0.25) 100%)",
              pointerEvents: "none",
            }}
          />
        </Box>

        <Box
          sx={{
            p: { xs: 3, sm: 4, md: 7 },
            alignSelf: "center",
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              left: 0,
              top: "12%",
              bottom: "12%",
              width: "1px",
              background: "linear-gradient(180deg, transparent 0%, rgba(45, 212, 191, 0.6) 50%, transparent 100%)",
              display: { xs: "none", md: "block" },
              boxShadow: "0 0 12px rgba(45, 212, 191, 0.4)",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              left: "-1px",
              top: "12%",
              bottom: "12%",
              width: "2px",
              background: "radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)",
              filter: "blur(1px)",
              display: { xs: "none", md: "block" },
            },
          }}
        >
          <Stack spacing={3.5} sx={{ position: "relative" }}>
            <Box>
              <Typography variant="h2" sx={{ fontWeight: 900, letterSpacing: "-0.03em" }}>
                Sign in
              </Typography>
            </Box>
            <Divider sx={{ borderColor: "rgba(13, 81, 77, 0.14)" }} />
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
