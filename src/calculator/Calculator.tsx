import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CalculateRoundedIcon from "@mui/icons-material/CalculateRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import WorkspaceHeader from "../components/WorkspaceHeader";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { CalculatorSocket } from "./api";
import {
  connectionClosed,
  connectionError,
  connectionReady,
  connectionStarted,
  operationChanged,
  protocolError,
  resultReceived,
} from "./slice";
import type { CalculatorOperation } from "./types";

const operations: { value: CalculatorOperation; label: string; symbol: string }[] = [
  { value: "add", label: "Addition", symbol: "+" },
  { value: "subtract", label: "Subtraction", symbol: "−" },
  { value: "multiply", label: "Multiplication", symbol: "×" },
  { value: "divide", label: "Division", symbol: "÷" },
];

export default function Calculator() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.accessToken);
  const { status, operation, result, error } = useAppSelector(
    (state) => state.calculator,
  );
  const socketRef = useRef<CalculatorSocket | null>(null);
  const [operandText, setOperandText] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [connectionAttempt, setConnectionAttempt] = useState(0);

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = new CalculatorSocket(
      token,
      (message) => {
        if (message.type === "ready") {
          setIsPending(false);
          dispatch(connectionReady());
        } else if (message.type === "result") {
          setIsPending(false);
          dispatch(resultReceived(message.result));
        } else {
          setIsPending(false);
          dispatch(protocolError(message.message));
        }
      },
      (message) => {
        setIsPending(false);
        dispatch(connectionError(message));
      },
      () => {
        setIsPending(false);
        dispatch(connectionClosed());
      },
    );

    socketRef.current = socket;
    dispatch(connectionStarted());
    socket.connect();

    return () => {
      const isCurrentSocket = socketRef.current === socket;
      socket.close();

      if (isCurrentSocket) {
        socketRef.current = null;
        setIsPending(false);
        dispatch(connectionClosed());
      }
    };
  }, [connectionAttempt, dispatch, token]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInputError(null);

    if (isPending) {
      return;
    }

    const operandValues = operandText.split(",");

    if (operandValues.some((value) => value.trim() === "")) {
      setInputError("Each operand must contain a number.");
      return;
    }

    const operands = operandValues.map((value) => Number(value.trim()));

    if (
      operands.length < 1 ||
      operands.length > 100 ||
      operands.some(
        (operand) => !Number.isFinite(operand) || Math.abs(operand) > 1e12,
      )
    ) {
      setInputError(
        "Enter 1 to 100 finite numbers, each with an absolute value of at most 1e12.",
      );
      return;
    }

    if (
      operation === "divide" &&
      operands.slice(1).some((operand) => operand === 0)
    ) {
      setInputError("Division by zero is not allowed.");
      return;
    }

    if (status !== "ready" || !socketRef.current?.send({ operation, numbers: operands })) {
      setInputError("The calculator is not ready.");
      return;
    }

    setIsPending(true);
  }

  const selectedOperation = operations.find((item) => item.value === operation);
  const connectionLabel =
    status === "ready"
      ? "Connected"
      : status === "connecting"
        ? "Connecting"
        : status === "connection-error"
          ? "Connection issue"
          : "Disconnected";

  return (
    <Stack spacing={3}>
      <WorkspaceHeader
        title="Precision Calculator"
        description="Authenticated WebSocket calculator with real-time computation and resilient connection handling."
        action={
          <Chip
            icon={status === "ready" ? <CheckCircleRoundedIcon /> : <LinkRoundedIcon />}
            color={status === "ready" ? "success" : status === "connection-error" ? "error" : "default"}
            variant="outlined"
            label={connectionLabel}
            sx={{ alignSelf: { xs: "flex-start", sm: "center" }, fontWeight: 600 }}
          />
        }
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.1fr) minmax(320px, 0.9fr)" },
          gap: 3,
          alignItems: "stretch",
        }}
      >
        <Card
          variant="outlined"
          sx={{
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: "0 30px 60px -40px rgba(13, 81, 77, 0.9)",
          }}
        >
          <Box
            sx={{
              px: { xs: 2.5, sm: 4 },
              pt: { xs: 2.5, sm: 4 },
              pb: { xs: 2, sm: 3 },
              background:
                "radial-gradient(circle at top, rgba(18, 107, 102, 0.12), transparent 65%)",
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 3 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 3,
                  bgcolor: "primary.main",
                  color: "common.white",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 18px 40px -24px rgba(13, 81, 77, 1)",
                }}
              >
                <CalculateRoundedIcon />
              </Box>
              <Box>
                <Typography variant="h3">Compute with precision</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Send validated operations to the authenticated calculator service
                </Typography>
              </Box>
            </Stack>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  select
                  label="Operation"
                  value={operation}
                  onChange={(event) =>
                    dispatch(operationChanged(event.target.value as CalculatorOperation))
                  }
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                    },
                  }}
                >
                  {operations.map((item) => (
                    <MenuItem key={item.value} value={item.value}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Typography sx={{ width: 24, fontWeight: 800, textAlign: "center" }}>
                          {item.symbol}
                        </Typography>
                        <Typography sx={{ fontWeight: 600 }}>{item.label}</Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Operands"
                  placeholder="12, 8, 4"
                  value={operandText}
                  onChange={(event) => setOperandText(event.target.value)}
                  fullWidth
                  helperText="Comma-separated values • 1–100 numbers • |value| ≤ 10^12"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                    },
                  }}
                />
                {inputError && <Alert severity="warning" sx={{ borderRadius: 3 }}>{inputError}</Alert>}
                {error && <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    startIcon={
                      isPending ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <CalculateRoundedIcon />
                      )
                    }
                    disabled={status !== "ready" || isPending}
                    sx={{
                      borderRadius: 999,
                      px: 4,
                      fontWeight: 700,
                      boxShadow: "0 20px 40px -30px rgba(13, 81, 77, 1)",
                    }}
                  >
                    {isPending ? "Calculating…" : "Calculate"}
                  </Button>
                  {(status === "connection-error" || status === "disconnected") && (
                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<ReplayRoundedIcon />}
                      onClick={() => setConnectionAttempt((current) => current + 1)}
                      sx={{ borderRadius: 999, px: 3, fontWeight: 600 }}
                    >
                      Reconnect
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Box>
          </Box>
        </Card>

        <Card
          variant="outlined"
          sx={{
            borderRadius: 4,
            overflow: "hidden",
            borderColor: "transparent",
            color: "common.white",
            background: "radial-gradient(circle at top, #1f9c93 0%, #0d514d 55%, #072b28 100%)",
            boxShadow: "0 40px 80px -60px rgba(13, 81, 77, 1)",
            position: "relative",
          }}
        >
          <Box
            aria-hidden="true"
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 20% 0%, rgba(255,255,255,0.16), transparent 55%)",
              pointerEvents: "none",
            }}
          />
          <CardContent
            sx={{
              position: "relative",
              p: { xs: 3, sm: 4 },
              minHeight: { lg: 360 },
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="overline" sx={{ letterSpacing: "0.4em", color: "rgba(255,255,255,0.7)" }}>
                LIVE RESULT
              </Typography>
              <Chip
                size="small"
                label={selectedOperation?.symbol ?? "+"}
                sx={{
                  bgcolor: "rgba(255,255,255,0.16)",
                  color: "common.white",
                  fontWeight: 800,
                  borderRadius: 999,
                }}
              />
            </Stack>
            <Typography variant="h4" sx={{ mt: 2, fontWeight: 700 }}>
              {selectedOperation?.label ?? "Calculation"}
            </Typography>
            <Box
              sx={{
                mt: 4,
                flex: 1,
                minHeight: 150,
                p: { xs: 2.5, sm: 3 },
                borderRadius: 4,
                bgcolor: "rgba(5, 30, 28, 0.55)",
                border: "1px solid rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                textAlign: "right",
                boxShadow: "inset 0 30px 60px -40px rgba(255,255,255,0.4)",
              }}
            >
              {isPending ? (
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mr: "auto" }} role="status">
                  <CircularProgress size={20} color="inherit" sx={{ color: "primary.light" }} />
                  <Typography color="rgba(255,255,255,0.8)">Computing…</Typography>
                </Stack>
              ) : result !== null ? (
                <Typography
                  sx={{
                    fontSize: { xs: "3rem", sm: "4.5rem", md: "5rem" },
                    fontWeight: 800,
                    letterSpacing: "-0.08em",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 0.95,
                    overflowWrap: "anywhere",
                  }}
                  role="status"
                >
                  {result}
                </Typography>
              ) : (
                <Typography color="rgba(255,255,255,0.6)" sx={{ ml: "auto" }}>
                  Awaiting calculation
                </Typography>
              )}
            </Box>
            <Typography variant="caption" sx={{ mt: 3, color: "rgba(255,255,255,0.6)" }}>
              {status === "ready"
                ? "Socket ready • Secure authenticated channel"
                : "Establishing secure connection to the calculator service"}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}
