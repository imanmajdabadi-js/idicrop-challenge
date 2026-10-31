import { lazy, Suspense, useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import CalculateRoundedIcon from "@mui/icons-material/CalculateRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import StreamRoundedIcon from "@mui/icons-material/StreamRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import LoginForm from "./auth/LoginForm";
import WorkspaceErrorBoundary from "./components/WorkspaceErrorBoundary";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { clearSession } from "./auth/slice";

type Workspace = "tasks" | "calculator" | "echo" | "stream";

const Calculator = lazy(() => import("./calculator/Calculator"));
const Echo = lazy(() => import("./echo/Echo"));
const TaskManager = lazy(() => import("./tasks/TaskManager"));
const StreamingEcho = lazy(() => import("./streaming-echo/StreamingEcho"));

const navigation: {
  id: Workspace;
  label: string;
  description: string;
  icon: typeof TaskAltRoundedIcon;
}[] = [
  {
    id: "tasks",
    label: "Task workspace",
    description: "Manage your work",
    icon: TaskAltRoundedIcon,
  },
  {
    id: "calculator",
    label: "Calculator",
    description: "WebSocket utility",
    icon: CalculateRoundedIcon,
  },
  {
    id: "echo",
    label: "Text Echo",
    description: "Message diagnostics",
    icon: ForumRoundedIcon,
  },
  {
    id: "stream",
    label: "Streaming Echo",
    description: "Incremental response",
    icon: StreamRoundedIcon,
  },
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Stack direction="row" spacing={1.4} sx={{ alignItems: "center" }}>
      <Box
        aria-hidden="true"
        sx={{
          width: 38,
          height: 38,
          borderRadius: 2.5,
          bgcolor: "primary.main",
          color: "common.white",
          display: "grid",
          placeItems: "center",
          fontWeight: 800,
          letterSpacing: "-0.08em",
          fontSize: 17,
        }}
      >
        ID
      </Box>
      {!compact && (
        <Box>
          <Typography variant="subtitle1" sx={{ lineHeight: 1.15 }}>
            IDICorp
          </Typography>
          <Typography variant="caption" color="text.secondary">
            SERVICE CONSOLE
          </Typography>
        </Box>
      )}
    </Stack>
  );
}

export default function AppLayout() {
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const dispatch = useAppDispatch();
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>("tasks");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [visitedWorkspaces, setVisitedWorkspaces] = useState<
    Record<Workspace, boolean>
  >({
    tasks: true,
    calculator: false,
    echo: false,
    stream: false,
  });
  const [echoActive, setEchoActive] = useState(false);
  const [streamActive, setStreamActive] = useState(false);

  if (!accessToken) {
    return <LoginForm />;
  }

  function renderWorkspace(workspace: Workspace) {
    if (workspace === "tasks") return <TaskManager />;
    if (workspace === "calculator") return <Calculator />;
    if (workspace === "echo") {
      return <Echo onActivityChange={setEchoActive} />;
    }
    return <StreamingEcho onActivityChange={setStreamActive} />;
  }

  function renderNavigation() {
    return (
      <Box
        component="nav"
        aria-label="Main navigation"
        sx={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <Box sx={{ px: 3, py: 2.5 }}>
          <BrandMark />
        </Box>
        <Divider />
        <Box sx={{ px: 2, pt: 3, pb: 1 }}>
          <Typography variant="overline" color="text.secondary">
            WORKSPACE
          </Typography>
        </Box>
        <List sx={{ px: 1.5, py: 0 }}>
          {navigation.map((item) => {
            const Icon = item.icon;
            const selected = activeWorkspace === item.id;

            return (
              <ListItemButton
                key={item.id}
                selected={selected}
                aria-current={selected ? "page" : undefined}
                onClick={() => {
                  setActiveWorkspace(item.id);
                  setVisitedWorkspaces((current) => ({ ...current, [item.id]: true }));
                  setMobileOpen(false);
                }}
                sx={{
                  px: 1.5,
                  py: 1.1,
                  mb: 0.6,
                  borderRadius: 2.5,
                  alignItems: "flex-start",
                  "&.Mui-selected": {
                    bgcolor: "primary.light",
                    color: "primary.dark",
                    "&:hover": { bgcolor: "primary.light" },
                    "& .MuiListItemIcon-root": { color: "primary.dark" },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 38, mt: 0.2, color: "text.secondary" }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  secondary={item.description}
                  slotProps={{
                    primary: { sx: { fontWeight: selected ? 700 : 600, fontSize: 13 } },
                    secondary: { sx: { fontSize: 11.5, mt: 0.25 } },
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
        <Box sx={{ mt: "auto", px: 2, pb: 2 }}>
          <Divider sx={{ mb: 2 }} />
          <Stack direction="row" spacing={1.25} sx={{ px: 1, alignItems: "center" }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: "secondary.light",
                color: "secondary.dark",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              ID
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 650 }}>
                Authenticated
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Token held in memory
              </Typography>
            </Box>
            <Button
              size="small"
              variant="text"
              color="inherit"
              startIcon={<LogoutRoundedIcon />}
              onClick={() => dispatch(clearSession())}
              aria-label="Sign out"
              sx={{ ml: "auto", textTransform: "none", fontWeight: 600 }}
            >
              Sign out
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", bgcolor: "background.default" }}>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: 260,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 260,
            boxSizing: "border-box",
            position: "relative",
            border: 0,
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          },
        }}
      >
        {renderNavigation()}
      </Drawer>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: 280, boxSizing: "border-box" },
        }}
      >
        {renderNavigation()}
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "rgba(255,255,255,.92)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Toolbar sx={{ minHeight: { xs: 64, sm: 72 }, px: { xs: 2, sm: 3 } }}>
            <IconButton
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
              sx={{ display: { xs: "inline-flex", md: "none" }, mr: 1.5 }}
            >
              <MenuRoundedIcon />
            </IconButton>
            <Box sx={{ display: { xs: "block", md: "none" }, mr: "auto" }}>
              <BrandMark compact />
            </Box>
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ ml: { xs: 0, md: "auto" }, alignItems: "center" }}
            >
              <Chip
                size="small"
                color="success"
                variant="outlined"
                label="Session active"
                sx={{ display: { xs: "none", sm: "inline-flex" } }}
              />
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: "primary.light",
                  color: "primary.dark",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                ID
              </Avatar>
            </Stack>
          </Toolbar>
        </AppBar>
        <Box
          component="main"
          sx={{
            width: "100%",
            maxWidth: 1560,
            mx: "auto",
            px: { xs: 2, sm: 3, lg: 5 },
            py: { xs: 1.5, sm: 2, md: 2.5 },
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {(echoActive && activeWorkspace !== "echo") ||
          (streamActive && activeWorkspace !== "stream") ? (
            <Stack
              role="status"
              aria-live="polite"
              aria-label="Background workspace activity"
              direction="row"
              useFlexGap
              spacing={1}
              sx={{ flexWrap: "wrap", mb: 1.5 }}
            >
              {echoActive && activeWorkspace !== "echo" && (
                <Chip size="small" color="info" variant="outlined" label="Text Echo active" />
              )}
              {streamActive && activeWorkspace !== "stream" && (
                <Chip size="small" color="info" variant="outlined" label="Streaming Echo active" />
              )}
            </Stack>
          ) : null}
          <Box sx={{ mb: { xs: 1, md: 1.5 } }}>
            <Typography variant="overline" color="primary.main">
              IDICORP / SERVICE TOOLS
            </Typography>
          </Box>
          <Suspense
            fallback={
              <Stack
                role="status"
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center", color: "text.secondary", py: 4 }}
              >
                <CircularProgress size={20} />
                <Typography variant="body2">Loading workspace…</Typography>
              </Stack>
            }
          >
            {navigation.map(
              (item) =>
                visitedWorkspaces[item.id] && (
                  <Box
                    key={item.id}
                    sx={{ display: activeWorkspace === item.id ? "block" : "none" }}
                  >
                    <WorkspaceErrorBoundary workspaceName={item.label}>
                      {renderWorkspace(item.id)}
                    </WorkspaceErrorBoundary>
                  </Box>
                ),
            )}
          </Suspense>
        </Box>
      </Box>
    </Box>
  );
}
