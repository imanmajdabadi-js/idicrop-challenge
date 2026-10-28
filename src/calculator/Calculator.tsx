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
    <Stack spacing={2.5}>
      <WorkspaceHeader
        title="Calculator"
        description="Run arithmetic operations through the authenticated calculator socket."
        action={
          <Chip
            icon={status === "ready" ? <CheckCircleRoundedIcon /> : <LinkRoundedIcon />}
            color={status === "ready" ? "success" : status === "connection-error" ? "error" : "default"}
            variant="outlined"
            label={connectionLabel}
            sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
          />
        }
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.15fr) minmax(280px, .85fr)" },
          gap: 2,
          alignItems: "stretch",
        }}
      >
        <Card variant="outlined">
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mb: 2.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  bgcolor: "primary.light",
                  color: "primary.dark",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <CalculateRoundedIcon />
              </Box>
              <Box>
                <Typography variant="h4">Operation</Typography>
                <Typography variant="caption" color="text.secondary">
                  Enter comma-separated numbers
                </Typography>
              </Box>
            </Stack>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Operation"
                  value={operation}
                  onChange={(event) =>
                    dispatch(operationChanged(event.target.value as CalculatorOperation))
                  }
                  fullWidth
                >
                  {operations.map((item) => (
                    <MenuItem key={item.value} value={item.value}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Typography sx={{ width: 22, fontWeight: 700, textAlign: "center" }}>
                          {item.symbol}
                        </Typography>
                        <Typography>{item.label}</Typography>
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
                  helperText="Use commas between values. Enter 1–100 finite numbers."
                />
                {inputError && <Alert severity="warning">{inputError}</Alert>}
                {error && <Alert severity="error">{error}</Alert>}
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={
                    isPending ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <CalculateRoundedIcon />
                    )
                  }
                  disabled={status !== "ready" || isPending}
                  sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
                >
                  {isPending ? "Calculating…" : "Calculate"}
                </Button>
                {(status === "connection-error" || status === "disconnected") && (
                  <Button
                    variant="text"
                    startIcon={<ReplayRoundedIcon />}
                    onClick={() => setConnectionAttempt((current) => current + 1)}
                  >
                    Reconnect calculator
                  </Button>
                )}
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            color: "common.white",
            bgcolor: "primary.dark",
            borderColor: "primary.dark",
            background: (currentTheme) =>
              `linear-gradient(145deg, ${currentTheme.palette.primary.dark} 0%, ${currentTheme.palette.primary.main} 100%)`,
          }}
        >
          <CardContent
            sx={{
              p: { xs: 2.5, sm: 3 },
              minHeight: { lg: 320 },
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography variant="overline" color="primary.light">
              RESULT
            </Typography>
            <Typography variant="h4" sx={{ mt: 1 }}>
              {selectedOperation?.label ?? "Calculation"}
            </Typography>
            <Box
              sx={{
                mt: 3,
                minHeight: 128,
                p: { xs: 2, sm: 2.5 },
                borderRadius: 3,
                bgcolor: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.12)",
                display: "flex",
                alignItems: "center",
                overflowWrap: "anywhere",
              }}
            >
              {isPending ? (
                <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }} role="status">
                  <CircularProgress size={19} color="inherit" sx={{ color: "primary.light" }} />
                  <Typography color="rgba(255,255,255,.78)">Waiting for result…</Typography>
                </Stack>
              ) : result !== null ? (
                <Typography
                  sx={{
                    fontSize: { xs: "2.3rem", sm: "3rem" },
                    fontWeight: 700,
                    letterSpacing: "-0.05em",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1.15,
                    overflowWrap: "anywhere",
                  }}
                  role="status"
                >
                  {result}
                </Typography>
              ) : (
                <Typography color="rgba(255,255,255,.66)">
                  Your result will appear here.
                </Typography>
              )}
            </Box>
            <Typography variant="caption" sx={{ mt: "auto", pt: 2, color: "rgba(255,255,255,.62)" }}>
              {status === "ready"
                ? "The calculator is ready for an operation."
                : "A ready connection is required before calculating."}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}
