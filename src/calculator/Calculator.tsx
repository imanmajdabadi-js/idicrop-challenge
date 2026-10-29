import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
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

type KeyConfig = {
  label: string;
  value: string;
  variant?: "number" | "operator" | "action" | "equals";
};

const keys: KeyConfig[] = [
  { label: "7", value: "7", variant: "number" },
  { label: "8", value: "8", variant: "number" },
  { label: "9", value: "9", variant: "number" },
  { label: "÷", value: "divide", variant: "operator" },
  { label: "4", value: "4", variant: "number" },
  { label: "5", value: "5", variant: "number" },
  { label: "6", value: "6", variant: "number" },
  { label: "×", value: "multiply", variant: "operator" },
  { label: "1", value: "1", variant: "number" },
  { label: "2", value: "2", variant: "number" },
  { label: "3", value: "3", variant: "number" },
  { label: "−", value: "subtract", variant: "operator" },
  { label: "0", value: "0", variant: "number" },
  { label: ".", value: ".", variant: "number" },
  { label: ",", value: ",", variant: "number" },
  { label: "+", value: "add", variant: "operator" },
];

export default function Calculator() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.accessToken);
  const { status, operation, result, error } = useAppSelector(
    (state) => state.calculator,
  );
  const socketRef = useRef<CalculatorSocket | null>(null);
  const [display, setDisplay] = useState("0");
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
          setDisplay(String(message.result));
        } else {
          setIsPending(false);
          dispatch(protocolError(message.message));
          setInputError(message.message);
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

  function handleKeyPress(key: KeyConfig) {
    setInputError(null);

    if (key.variant === "operator") {
      dispatch(operationChanged(key.value as CalculatorOperation));
      const opMap: Record<string, string> = { add: "+", subtract: "−", multiply: "×", divide: "÷" };
      const symbol = opMap[key.value] || ",";
      if (display === "0" || display === "") {
        setDisplay("0" + symbol);
      } else if (display.endsWith("+") || display.endsWith("−") || display.endsWith("×") || display.endsWith("÷") || display.endsWith(",")) {
        setDisplay(display.replace(/[+,−×÷,]$/, symbol));
      } else {
        setDisplay(display + symbol);
      }
      return;
    }

    if (key.value === ".") {
      // Add decimal to current number
      const parts = display.split(/[+,−×÷]/);
      const current = parts[parts.length - 1];
      if (current.includes(".")) {
        return;
      }
      if (current === "" || current === "0") {
        parts[parts.length - 1] = "0.";
      } else {
        parts[parts.length - 1] = current + ".";
      }
      const operators = display.match(/[+,−×÷]/g) || [];
      let rebuilt = parts[0];
      for (let i = 0; i < operators.length; i++) {
        rebuilt += operators[i] + parts[i + 1];
      }
      setDisplay(rebuilt);
      return;
    }

    if (key.value === ",") {
      if (/[+,−×÷]$/.test(display) || display.endsWith(",")) {
        return;
      }
      setDisplay(display + ",");
      return;
    }

    // Number
    if (display === "0") {
      setDisplay(key.value);
    } else if (/[+,−×÷]$/.test(display)) {
      setDisplay(display + key.value);
    } else {
      const parts = display.split(/[+,−×÷]/);
      const current = parts[parts.length - 1];
      if (current === "0") {
        parts[parts.length - 1] = key.value;
      } else {
        parts[parts.length - 1] = current + key.value;
      }
      const operators = display.match(/[+,−×÷]/g) || [];
      let rebuilt = parts[0];
      for (let i = 0; i < operators.length; i++) {
        rebuilt += operators[i] + parts[i + 1];
      }
      setDisplay(rebuilt);
    }
  }

  function handleClear() {
    setDisplay("0");
    setInputError(null);
    dispatch(resultReceived(null as any));
  }

  function handleEquals(event?: FormEvent) {
    if (event) {
      event.preventDefault();
    }
    setInputError(null);

    if (isPending) {
      return;
    }

    // Build operand list from display - split by operators
    const normalized = display.replace(/[−×÷]/g, (m) => {
      if (m === "−") return ",";
      if (m === "×") return ",";
      if (m === "÷") return ",";
      return m;
    });
    const operandValues = normalized.split(",");

    if (operandValues.some((value) => value.trim() === "")) {
      setInputError("Enter valid operands.");
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
    <Stack spacing={2}>
      <WorkspaceHeader
        title="Calculator"
        description=""
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

      {(status === "connection-error" || status === "disconnected") && (
        <Button
          variant="text"
          startIcon={<ReplayRoundedIcon />}
          onClick={() => setConnectionAttempt((current) => current + 1)}
          sx={{ alignSelf: "flex-start" }}
        >
          Reconnect calculator
        </Button>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          pt: { xs: 0, md: 0.5 },
          pb: { xs: 1, md: 2 },
        }}
      >
        <Box
          sx={{
            width: { xs: "100%", sm: 320 },
            background: "linear-gradient(145deg, #0d514d 0%, #126b66 100%)",
            borderRadius: { xs: "16px", sm: "24px" },
            padding: { xs: "12px", sm: "24px" },
            boxShadow: "0 40px 80px -40px rgba(13, 81, 77, 0.9), inset 0 1px 0 rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            position: "relative",
            maxWidth: "calc(100vw - 24px)",
            mx: "auto",
          }}
        >
          <Box
            sx={{
              textAlign: "center",
              color: "rgba(255,255,255,0.8)",
              fontSize: { xs: "9px", sm: "11px" },
              letterSpacing: { xs: "0.28em", sm: "0.36em" },
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
          </Box>

          <Box
            sx={{
              background: "linear-gradient(180deg, #a7f3d0 0%, #6ee7b7 100%)",
              borderRadius: { xs: "8px", sm: "12px" },
              padding: { xs: "8px 10px", sm: "12px 16px" },
              marginBottom: { xs: "10px", sm: "20px" },
              border: "1px solid rgba(13, 81, 77, 0.4)",
              boxShadow: "inset 0 2px 8px rgba(6, 78, 59, 0.25)",
            }}
          >
            <Box
              sx={{
                background: "rgba(6, 78, 59, 0.9)",
                borderRadius: { xs: "6px", sm: "8px" },
                padding: { xs: "6px 8px", sm: "12px 16px" },
                minHeight: { xs: "48px", sm: "60px" },
                height: { xs: "48px", sm: "60px" },
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                fontFamily: "'Courier New', monospace",
                fontSize: { xs: "1.2rem", sm: "1.8rem", md: "2.2rem" },
                fontWeight: 700,
                color: isPending ? "rgba(167, 243, 208, 0.5)" : "#a7f3d0",
                letterSpacing: "0.05em",
                overflowX: "auto",
                overflowY: "hidden",
                whiteSpace: "nowrap",
                boxShadow: "inset 0 2px 6px rgba(0,0,0,0.4)",
                transition: "color 150ms ease",
                willChange: "color",
              }}
            >
              {isPending ? "" : display}
            </Box>
            <Box
              sx={{
                mt: 1,
                textAlign: "right",
                color: "rgba(6, 78, 59, 0.85)",
                fontSize: "10px",
                fontWeight: 600,
              }}
            >
            </Box>
          </Box>

          {inputError && (
          <Alert severity="warning" sx={{ mb: 2, py: 0.5, fontSize: "0.75rem", borderRadius: 2, bgcolor: "rgba(251, 191, 36, 0.12)", color: "blue", border: "1px solid rgba(245, 158, 11, 0.4)" }}>
            {inputError}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2, py: 0.5, fontSize: "0.75rem", borderRadius: 2, bgcolor: "rgba(239, 68, 68, 0.12)", color: "#991b1b", border: "1px solid rgba(239, 68, 68, 0.4)" }}>
            {error}
          </Alert>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: { xs: "4px", sm: "10px" },
            }}
          >
            {keys.map((key) => (
              <Button
                key={key.label}
                onClick={() => handleKeyPress(key)}
                disabled={isPending || status !== "ready"}
                sx={{
                  aspectRatio: "1",
                  minHeight: { xs: 38, sm: 52 },
                  borderRadius: { xs: "8px", sm: "12px" },
                  fontSize: { xs: "1rem", sm: "1.4rem" },
                  fontWeight: 700,
                background:
                  key.variant === "operator"
                    ? "linear-gradient(145deg, #14b8a6 0%, #0d9488 100%)"
                    : "linear-gradient(145deg, #1f7f75 0%, #126b66 100%)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: "0 4px 10px rgba(6, 78, 59, 0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
                transition: "all 0.1s ease",
                padding: 0,
                "&:hover": {
                  background:
                    key.variant === "operator"
                      ? "linear-gradient(145deg, #2dd4bf 0%, #14b8a6 100%)"
                      : "linear-gradient(145deg, #229a8f 0%, #1f7f75 100%)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 6px 14px rgba(6, 78, 59, 0.4), inset 0 1px 0 rgba(255,255,255,0.18)",
                },
                "&:active": {
                  transform: "translateY(0px)",
                  boxShadow: "0 2px 6px rgba(6, 78, 59, 0.4), inset 0 2px 4px rgba(0,0,0,0.25)",
                },
                  "&:disabled": {
                    opacity: 0.4,
                    transform: "none",
                  },
                }}
              >
                {key.label}
              </Button>
            ))}
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: { xs: "4px", sm: "10px" }, mt: { xs: "4px", sm: "10px" } }}>
            <Button
              onClick={handleClear}
              disabled={isPending}
              sx={{
                height: { xs: 38, sm: 52 },
                borderRadius: { xs: "8px", sm: "12px" },
                fontSize: { xs: "0.9rem", sm: "1.1rem" },
                fontWeight: 700,
                background: "linear-gradient(145deg, #ef4444 0%, #dc2626 100%)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: "0 4px 10px rgba(127, 29, 29, 0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
                "&:hover": {
                  background: "linear-gradient(145deg, #f87171 0%, #ef4444 100%)",
                },
              }}
            >
              AC
            </Button>
            <Button
              onClick={handleEquals}
              disabled={isPending || status !== "ready"}
              sx={{
                height: { xs: 38, sm: 52 },
                borderRadius: { xs: "8px", sm: "12px" },
                fontSize: { xs: "1.2rem", sm: "1.6rem" },
                fontWeight: 800,
                background: "linear-gradient(145deg, #22d3ee 0%, #06b6d4 100%)",
                color: "#042f2e",
                border: "1px solid rgba(255,255,255,0.2)",
                boxShadow: "0 4px 12px rgba(6, 182, 212, 0.35), inset 0 1px 0 rgba(255,255,255,0.3)",
                "&:hover": {
                  background: "linear-gradient(145deg, #67e8f9 0%, #22d3ee 100%)",
                },
              }}
            >
              {isPending ? <CircularProgress size={18} color="inherit" sx={{ color: "#042f2e" }} /> : "="}
            </Button>
          </Box>
        </Box>
      </Box>
    </Stack>
  );
}
