import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StreamRoundedIcon from "@mui/icons-material/StreamRounded";
import { clearSession } from "../auth/slice";
import WorkspaceHeader from "../components/WorkspaceHeader";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { StreamingEchoError, streamEcho } from "./api";

type StreamStatus = "idle" | "submitting" | "streaming" | "success" | "cancelled" | "error";
type StreamingEchoProps = {
  onActivityChange: (active: boolean) => void;
};

const statusLabels: Record<StreamStatus, string> = {
  idle: "Ready to submit",
  submitting: "Starting request",
  streaming: "Receiving stream",
  success: "Complete",
  cancelled: "Cancelled",
  error: "Request failed",
};

export default function StreamingEcho({ onActivityChange }: StreamingEchoProps) {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.accessToken);
  const [text, setText] = useState("");
  const [responseText, setResponseText] = useState("");
  const [contentType, setContentType] = useState<string | null>(null);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const isActive = status === "submitting" || status === "streaming";

  useEffect(() => {
    onActivityChange(isActive);
  }, [isActive, onActivityChange]);

  useEffect(() => {
    return () => {
      requestId.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
      onActivityChange(false);
    };
  }, [onActivityChange]);

  function cancelRequest() {
    if (!controllerRef.current) {
      return;
    }

    requestId.current += 1;
    controllerRef.current.abort();
    controllerRef.current = null;
    setStatus("cancelled");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!text.trim()) {
      setError("Enter text before submitting.");
      setStatus("error");
      return;
    }

    if (!token) {
      setError("You must be signed in to use streaming echo.");
      setStatus("error");
      return;
    }

    requestId.current += 1;
    const currentRequestId = requestId.current;
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setResponseText("");
    setContentType(null);
    setError(null);
    setStatus("submitting");

    try {
      const result = await streamEcho(
        token,
        text,
        controller.signal,
        (chunk) => {
          if (requestId.current !== currentRequestId) {
            return;
          }

          setResponseText((current) => current + chunk);
          setStatus("streaming");
        },
      );

      if (requestId.current !== currentRequestId) {
        return;
      }

      setContentType(result.contentType);
      setStatus("success");
      controllerRef.current = null;
    } catch (requestError) {
      if (requestId.current !== currentRequestId) {
        return;
      }

      controllerRef.current = null;
      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        setStatus("cancelled");
        return;
      }

      if (requestError instanceof StreamingEchoError && requestError.status === 401) {
        dispatch(clearSession());
      }

      setStatus("error");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The streaming echo request failed.",
      );
    }
  }

  const statusColor =
    status === "success"
      ? "success"
      : status === "error"
        ? "error"
        : status === "streaming" || status === "submitting"
          ? "info"
          : "default";

  return (
    <Stack spacing={2.5}>
      <WorkspaceHeader
        title="Streaming Echo"
        description="Submit text and inspect the response as it arrives."
        action={
          <Chip
            variant="outlined"
            color={statusColor}
            icon={isActive ? <CircularProgress size={13} color="inherit" /> : <StreamRoundedIcon />}
            label={statusLabels[status]}
            sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
          />
        }
      />

      {isActive && <LinearProgress aria-label="Streaming response progress" />}
      {error && <Alert severity="error">{error}</Alert>}
      {status === "success" && (
        <Alert severity="success">The stream completed successfully.</Alert>
      )}
      {status === "cancelled" && (
        <Alert severity="info">The request was cancelled. Any received output is preserved.</Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, .9fr) minmax(0, 1.1fr)" },
          gap: 2,
          alignItems: "start",
        }}
      >
        <Card variant="outlined">
          <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mb: 2 }}>
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
                <PlayArrowRoundedIcon />
              </Box>
              <Box>
                <Typography variant="h4">Request input</Typography>
                <Typography variant="caption" color="text.secondary">
                  Sent as UTF-8 plain text
                </Typography>
              </Box>
            </Stack>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Text to echo"
                  placeholder="Type or paste text to submit…"
                  multiline
                  minRows={7}
                  fullWidth
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  disabled={isActive}
                  helperText="Whitespace-only input is not accepted."
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={
                      status === "submitting" ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <PlayArrowRoundedIcon />
                      )
                    }
                    disabled={isActive}
                    fullWidth
                  >
                    {status === "submitting" ? "Starting…" : "Start stream"}
                  </Button>
                  {isActive && (
                    <Button
                      type="button"
                      variant="outlined"
                      color="error"
                      startIcon={<CancelRoundedIcon />}
                      onClick={cancelRequest}
                      fullWidth
                    >
                      Cancel
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent sx={{ p: 0 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                p: { xs: 2, sm: 2.5 },
              }}
            >
              <Box>
                <Typography variant="h4">Response output</Typography>
                <Typography variant="caption" color="text.secondary">
                  {status === "streaming"
                    ? "New text appears progressively."
                    : status === "success"
                      ? "The response stream has ended."
                      : "Output will appear here."}
                </Typography>
              </Box>
              {contentType && (
                <Chip size="small" variant="outlined" label={contentType} />
              )}
            </Stack>
            <Box
              component="pre"
              aria-live="polite"
              aria-label="Streaming response"
              sx={{
                m: 0,
                minHeight: 280,
                maxHeight: { xs: 420, lg: 600 },
                overflow: "auto",
                p: { xs: 2, sm: 2.5 },
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: "background.default",
                color: "text.primary",
                fontFamily: '"Cascadia Code", "SFMono-Regular", Consolas, monospace',
                fontSize: 13,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              {responseText || (
                <Box component="span" sx={{ color: "text.secondary" }}>
                  Waiting for a request…
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}
