import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import WorkspaceHeader from "../components/WorkspaceHeader";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { addTask, editTask, loadTasks, removeTask } from "./slice";
import type { Task, TaskInput } from "./types";

const emptyForm: TaskInput = {
  title: "",
  description: "",
  completed: false,
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

export default function TaskManager() {
  const dispatch = useAppDispatch();
  const { items, hasLoaded, status, error } = useAppSelector((state) => state.tasks);
  const mutationInProgress = useRef(false);
  const [search, setSearch] = useState("");
  const [completed, setCompleted] = useState("");
  const [form, setForm] = useState<TaskInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const isLoading = status === "loading" || status === "idle";

  function refreshTasks() {
    void dispatch(
      loadTasks({
        q: search.trim() || undefined,
        completed: completed ? completed === "true" : undefined,
      }),
    );
  }

  useEffect(() => {
    refreshTasks();
  }, [completed, dispatch, search]);

  function updateField(field: "title" | "description", value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function closeForm() {
    setFormOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    setFormError(null);
  }

  function openCreateForm() {
    setForm(emptyForm);
    setEditingId(null);
    setFormError(null);
    setFormOpen(true);
  }

  function validateForm(): string | null {
    if (!form.title.trim()) {
      return "A title is required.";
    }

    if (form.title.length > 120) {
      return "Title must be 120 characters or fewer.";
    }

    if (form.description.length > 2000) {
      return "Description must be 2000 characters or fewer.";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading || mutationInProgress.current) {
      return;
    }

    const validationError = validateForm();
    setFormError(validationError);

    if (validationError) {
      return;
    }

    mutationInProgress.current = true;
    try {
      if (editingId === null) {
        const result = await dispatch(addTask(form));
        if (addTask.fulfilled.match(result)) {
          closeForm();
          setNotice("Task created.");
          refreshTasks();
        }
        return;
      }

      const result = await dispatch(editTask({ id: editingId, input: form }));
      if (editTask.fulfilled.match(result)) {
        closeForm();
        setNotice("Task updated.");
        refreshTasks();
      }
    } finally {
      mutationInProgress.current = false;
    }
  }

  function startEditing(task: Task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      completed: task.completed,
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!taskToDelete || isLoading || mutationInProgress.current) {
      return;
    }

    mutationInProgress.current = true;
    try {
      const result = await dispatch(removeTask(taskToDelete.id));
      if (removeTask.fulfilled.match(result)) {
        setTaskToDelete(null);
        setNotice("Task deleted.");
        refreshTasks();
      }
    } finally {
      mutationInProgress.current = false;
    }
  }

  return (
    <Stack spacing={2.5}>
      <WorkspaceHeader
        title="Tasks"
        description="Create, organize, and update your task list."
        action={
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={openCreateForm}
          >
            Create task
          </Button>
        }
      />

      <Card variant="outlined">
        <CardContent sx={{ p: { xs: 2, sm: 2.5 }, "&:last-child": { pb: { xs: 2, sm: 2.5 } } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            sx={{ alignItems: { xs: "stretch", md: "center" } }}
          >
            <TextField
              label="Search tasks"
              placeholder="Search by task text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              fullWidth
              slotProps={{
                htmlInput: { maxLength: 120 },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <FormControl sx={{ minWidth: { xs: "100%", md: 200 } }}>
              <InputLabel id="task-status-filter-label">Completion</InputLabel>
              <Select
                labelId="task-status-filter-label"
                label="Completion"
                value={completed}
                onChange={(event) => setCompleted(event.target.value)}
              >
                <MenuItem value="">All tasks</MenuItem>
                <MenuItem value="false">Incomplete</MenuItem>
                <MenuItem value="true">Completed</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", mt: 2, minHeight: 24 }}
          >
            <Chip
              size="small"
              variant="outlined"
              label={`${items.length} ${items.length === 1 ? "task" : "tasks"} shown`}
            />
            {isLoading && (
              <Typography variant="caption" color="text.secondary" role="status">
                Updating…
              </Typography>
            )}
          </Stack>
        </CardContent>
        {isLoading && <LinearProgress aria-label="Loading tasks" />}
      </Card>

      {error && <Alert severity="error">{error}</Alert>}
      {status === "failed" && (
        <Button variant="outlined" onClick={refreshTasks} sx={{ alignSelf: "flex-start" }}>
          Try again
        </Button>
      )}

      {hasLoaded && status !== "failed" && items.length === 0 && !isLoading ? (
        <Card variant="outlined">
          <CardContent sx={{ py: { xs: 5, sm: 7 }, textAlign: "center" }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                mx: "auto",
                mb: 2,
                borderRadius: 3,
                bgcolor: "primary.light",
                color: "primary.dark",
                display: "grid",
                placeItems: "center",
              }}
            >
              <CheckCircleOutlineRoundedIcon />
            </Box>
            <Typography variant="h3">
              {search || completed ? "No matching tasks" : "Your task list is clear"}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75, mb: 2.5 }}>
              {search || completed
                ? "Try changing the search or completion filter."
                : "Create a task to start organizing your work."}
            </Typography>
            {!search && !completed && (
              <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={openCreateForm}>
                Create your first task
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {items.map((task) => (
            <Card key={task.id} variant="outlined">
              <CardContent sx={{ p: { xs: 2, sm: 2.5 }, "&:last-child": { pb: { xs: 2, sm: 2.5 } } }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  sx={{ alignItems: { xs: "stretch", sm: "center" } }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      sx={{ alignItems: { xs: "flex-start", sm: "center" } }}
                    >
                      <Typography variant="h4" sx={{ overflowWrap: "anywhere" }}>
                        {task.title}
                      </Typography>
                      <Chip
                        size="small"
                        icon={
                          <CheckCircleOutlineRoundedIcon
                            sx={{ color: task.completed ? "success.main" : "text.secondary" }}
                          />
                        }
                        label={task.completed ? "Completed" : "In progress"}
                        color={task.completed ? "success" : "default"}
                        variant="outlined"
                      />
                    </Stack>
                    {task.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.75, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                      >
                        {task.description}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mt: 1.25 }}>
                      <EventOutlinedIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                      <Typography variant="caption" color="text.secondary">
                        Created {formatDate(task.created_at)}
                      </Typography>
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
                    <Tooltip title="Edit task">
                      <span>
                        <IconButton
                          aria-label={`Edit ${task.title}`}
                          onClick={() => startEditing(task)}
                          disabled={isLoading}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Delete task">
                      <span>
                        <IconButton
                          aria-label={`Delete ${task.title}`}
                          color="error"
                          onClick={() => setTaskToDelete(task)}
                          disabled={isLoading}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog
        open={formOpen}
        onClose={closeForm}
        fullWidth
        maxWidth="sm"
        aria-labelledby="task-form-title"
      >
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle id="task-form-title">
            {editingId === null ? "Create task" : "Edit task"}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                autoFocus
                label="Title"
                required
                fullWidth
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                slotProps={{ htmlInput: { maxLength: 120 } }}
                helperText={`${form.title.length}/120 characters`}
              />
              <TextField
                label="Description"
                fullWidth
                multiline
                minRows={3}
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                slotProps={{ htmlInput: { maxLength: 2000 } }}
                helperText={`${form.description.length}/2000 characters`}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.completed ?? false}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        completed: event.target.checked,
                      }))
                    }
                  />
                }
                label="Mark as completed"
              />
              {formError && <Alert severity="error">{formError}</Alert>}
              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={closeForm} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isLoading}>
              {isLoading && <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />}
              {editingId === null ? "Create task" : "Save changes"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={taskToDelete !== null}
        onClose={() => {
          if (!isLoading) setTaskToDelete(null);
        }}
        aria-labelledby="delete-task-title"
        aria-describedby="delete-task-description"
      >
        <DialogTitle id="delete-task-title">Delete this task?</DialogTitle>
        <DialogContent>
          <Typography id="delete-task-description" color="text.secondary">
            “{taskToDelete?.title}” will be permanently removed from your task list.
          </Typography>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setTaskToDelete(null)} disabled={isLoading}>
            Keep task
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void confirmDelete()}
            disabled={isLoading}
          >
            {isLoading && <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />}
            Delete task
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notice !== null}
        autoHideDuration={3500}
        onClose={() => setNotice(null)}
        message={notice}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      />
    </Stack>
  );
}
