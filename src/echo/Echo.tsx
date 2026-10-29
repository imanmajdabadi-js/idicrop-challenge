import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CableRoundedIcon from "@mui/icons-material/CableRounded";
import LinkOffRoundedIcon from "@mui/icons-material/LinkOffRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { EchoSocket } from "./api";
import WorkspaceHeader from "../components/WorkspaceHeader";
import type { EchoStatus } from "./types";
import { useAppSelector } from "../store/hooks";

type EchoHistoryItem = {
  id: number;
  direction: "sent" | "received";
  text: string;
};

type EchoProps = {
  onActivityChange: (active: boolean) => void;
};

export default function Echo({ onActivityChange }: EchoProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<EchoSocket | null>(null);
  const connectionGeneration = useRef(0);
  const nextMessageId = useRef(0);
  const [status, setStatus] = useState<EchoStatus>("disconnected");
  const [messages, setMessages] = useState<EchoHistoryItem[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { accessToken: token } = useAppSelector((state) => state.auth);

  function disconnect() {
    connectionGeneration.current += 1;
    socketRef.current?.close();
    socketRef.current = null;
    setStatus("disconnected");
  }

  function connect() {
    disconnect();
    const generation = connectionGeneration.current + 1;
    connectionGeneration.current = generation;
    setStatus("connecting");
    setError(null);

    const socket = new EchoSocket(
      token ?? '',
      (message) => {
        if (connectionGeneration.current !== generation) {
          return;
        }

        if (message.type === "ready") {
          setStatus("ready");
          setError(null);
        } else {
          setMessages((current) => [
            ...current,
            { id: nextMessageId.current++, direction: "received", text: message.text },
          ]);
        }
      },
      (message) => {
        if (connectionGeneration.current !== generation) {
          return;
        }

        setStatus("error");
        setError(message);
      },
      () => {
        if (connectionGeneration.current === generation) {
          setStatus("disconnected");
        }
      },
    );

    socketRef.current = socket;
    socket.connect();
  }

  useEffect(() => {
    onActivityChange(status === "connecting" || status === "ready");
  }, [onActivityChange, status]);

  useEffect(() => {
    return () => {
      connectionGeneration.current += 1;
      socketRef.current?.close();
      socketRef.current = null;
      onActivityChange(false);
    };
  }, [onActivityChange]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedText = text.trim();

    if (!trimmedText) {
      setError("Enter a message before sending.");
      return;
    }

    if (status !== "ready" || !socketRef.current?.send(trimmedText)) {
      setError("The echo connection is not ready.");
      return;
    }

    setMessages((current) => [
      ...current,
      { id: nextMessageId.current++, direction: "sent", text: trimmedText },
    ]);
    setText("");
    setError(null);
  }

  const statusColor =
    status === "ready" ? "success" : status === "error" ? "error" : "default";


  useEffect(() => {
    if (status === "disconnected") {
      connect();
    }
  }, [status]);

  useEffect(() => {
    return () => {
      disconnect();
    }
  }, []);

  useEffect(() => {
    if (container.current) {
      container.current.scrollTop = container.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Stack spacing={2.5}>
      <WorkspaceHeader
        title="Text Echo"
        description=""
        action={
          <Chip
            color={statusColor}
            variant="outlined"
            icon={status === "disconnected" ? <LinkOffRoundedIcon /> : <CableRoundedIcon />}
            label={status === "ready" ? "Connected · Ready" : status}
            sx={{ alignSelf: { xs: "flex-start", sm: "center" }, textTransform: "capitalize" }}
          />
        }
      />

      <Card variant="outlined">
        <CardContent sx={{ p: 0 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
              px: { xs: 2, sm: 2.5 },
              py: 2,
            }}
          >
            <Box>
              <Typography variant="h4">Message history</Typography>
              <Typography variant="caption" color="text.secondary">
                {messages.length} {messages.length === 1 ? "message" : "messages"} in this view
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} aria-label="Message direction key">
              <Typography variant="caption" color="text.secondary">Sent · you</Typography>
              <Typography variant="caption" color="text.secondary">Received · server</Typography>
            </Stack>
          </Stack>
          <Divider />
          <Box
            ref={container}
            aria-live="polite"
            sx={{
              minHeight: 220,
              maxHeight: { xs: 360, sm: 480 },
              overflowY: "auto",
              p: { xs: 2, sm: 2.5 },
              bgcolor: "background.default",
            }}
          >
            {messages.length === 0 ? (
              <Stack
                sx={{
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 170,
                  textAlign: "center",
                }}
              >
                <CableRoundedIcon sx={{ color: "text.disabled", fontSize: 30, mb: 1 }} />
                <Typography variant="subtitle1">No messages yet</Typography>
                <Typography variant="body2" color="text.secondary">
                  Connect, then send a message to begin.
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={1.25}>
                {messages.map((message) => {
                  const sent = message.direction === "sent";

                  return (
                    <Box
                      key={message.id}
                      sx={{
                        alignSelf: sent ? "flex-end" : "flex-start",
                        width: "fit-content",
                        maxWidth: { xs: "94%", sm: "78%" },
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mb: 0.5, textAlign: sent ? "right" : "left" }}
                      >
                        {sent ? "Sent · you" : "Received · server"}
                      </Typography>
                      <Box
                        sx={{
                          px: 1.75,
                          py: 1.25,
                          borderRadius: sent ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                          bgcolor: sent ? "primary.light" : "common.white",
                          color: "text.primary",
                          border: "1px solid",
                          borderColor: sent ? "primary.light" : "divider",
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                        }}
                      >
                        <Typography variant="body2">{message.text}</Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
          <Divider />
          <Box component="form" onSubmit={handleSubmit} sx={{ p: { xs: 1.5, sm: 2 } }}>
            <TextField
              label="Message"
              placeholder="Write a message…"
              value={text}
              onChange={(event) => setText(event.target.value)}
              fullWidth
              disabled={status !== "ready"}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Send message">
                        <span>
                          <IconButton
                            type="submit"
                            aria-label="Send message"
                            color="primary"
                            disabled={status !== "ready" || !text.trim()}
                          >
                            <SendRoundedIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
