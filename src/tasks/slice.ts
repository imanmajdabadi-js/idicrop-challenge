import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { clearSession } from "../auth/slice";
import type { RootState } from "../store/store";
import {
  createTask,
  deleteTask,
  fetchTask,
  fetchTasks,
  TaskApiError,
  updateTask,
} from "./api";
import type { Task, TaskInput, TaskListParams } from "./types";

type TaskState = {
  items: Task[];
  detail: Task | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  detailStatus: "idle" | "loading" | "succeeded" | "failed";
  detailError: string | null;
  listRequestId: string | null;
  detailRequestId: string | null;
  mutationRequestId: string | null;
};

const initialState: TaskState = {
  items: [],
  detail: null,
  status: "idle",
  error: null,
  detailStatus: "idle",
  detailError: null,
  listRequestId: null,
  detailRequestId: null,
  mutationRequestId: null,
};

type ThunkConfig = {
  state: RootState;
  rejectValue: string;
};

function getErrorMessage(error: object): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "The task request could not be completed.";
}

function requireToken(state: RootState): string {
  const token = state.auth.accessToken;

  if (!token) {
    throw new Error("You must be signed in to manage tasks.");
  }

  return token;
}

function clearSessionForUnauthorizedError(
  error: Error,
  dispatch: (action: ReturnType<typeof clearSession>) => void,
): void {
  if (error instanceof TaskApiError && error.status === 401) {
    dispatch(clearSession());
  }
}

export const loadTasks = createAsyncThunk<
  Task[],
  TaskListParams,
  ThunkConfig
>("tasks/loadTasks", async (params, { dispatch, getState, rejectWithValue }) => {
  try {
    return await fetchTasks(requireToken(getState()), params);
  } catch (error) {
    clearSessionForUnauthorizedError(
      error instanceof Error ? error : new Error(),
      dispatch,
    );
    return rejectWithValue(
      getErrorMessage(error instanceof Error ? error : new Error()),
    );
  }
});

export const loadTask = createAsyncThunk<Task, number, ThunkConfig>(
  "tasks/loadTask",
  async (id, { dispatch, getState, rejectWithValue }) => {
    try {
      return await fetchTask(requireToken(getState()), id);
    } catch (error) {
      clearSessionForUnauthorizedError(
        error instanceof Error ? error : new Error(),
        dispatch,
      );
      return rejectWithValue(
        getErrorMessage(error instanceof Error ? error : new Error()),
      );
    }
  },
);

type TaskMutation = {
  id: number;
  input: TaskInput;
};

export const addTask = createAsyncThunk<Task, TaskInput, ThunkConfig>(
  "tasks/addTask",
  async (input, { dispatch, getState, rejectWithValue }) => {
    try {
      return await createTask(requireToken(getState()), input);
    } catch (error) {
      clearSessionForUnauthorizedError(
        error instanceof Error ? error : new Error(),
        dispatch,
      );
      return rejectWithValue(
        getErrorMessage(error instanceof Error ? error : new Error()),
      );
    }
  },
);

export const editTask = createAsyncThunk<Task, TaskMutation, ThunkConfig>(
  "tasks/editTask",
  async ({ id, input }, { dispatch, getState, rejectWithValue }) => {
    try {
      return await updateTask(requireToken(getState()), id, input);
    } catch (error) {
      clearSessionForUnauthorizedError(
        error instanceof Error ? error : new Error(),
        dispatch,
      );
      return rejectWithValue(
        getErrorMessage(error instanceof Error ? error : new Error()),
      );
    }
  },
);

export const removeTask = createAsyncThunk<number, number, ThunkConfig>(
  "tasks/removeTask",
  async (id, { dispatch, getState, rejectWithValue }) => {
    try {
      return await deleteTask(requireToken(getState()), id);
    } catch (error) {
      clearSessionForUnauthorizedError(
        error instanceof Error ? error : new Error(),
        dispatch,
      );
      return rejectWithValue(
        getErrorMessage(error instanceof Error ? error : new Error()),
      );
    }
  },
);

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(clearSession, (state) => {
        state.items = [];
        state.detail = null;
        state.status = "idle";
        state.error = null;
        state.detailStatus = "idle";
        state.detailError = null;
        state.listRequestId = null;
        state.detailRequestId = null;
        state.mutationRequestId = null;
      })
      .addCase(loadTasks.pending, (state, action) => {
        state.status = "loading";
        state.error = null;
        state.listRequestId = action.meta.requestId;
      })
      .addCase(loadTasks.fulfilled, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) {
          return;
        }

        state.status = "succeeded";
        state.items = action.payload;
        state.listRequestId = null;
      })
      .addCase(loadTasks.rejected, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) {
          return;
        }

        state.status = "failed";
        state.error = action.payload ?? "Unable to load tasks.";
        state.listRequestId = null;
      })
      .addCase(addTask.fulfilled, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) {
          return;
        }

        state.items.unshift(action.payload);
        state.status = "succeeded";
        state.error = null;
        state.mutationRequestId = null;
      })
      .addCase(addTask.pending, (state, action) => {
        state.status = "loading";
        state.error = null;
        state.mutationRequestId = action.meta.requestId;
      })
      .addCase(addTask.rejected, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) {
          return;
        }

        state.status = "failed";
        state.error = action.payload ?? "Unable to create the task.";
        state.mutationRequestId = null;
      })
      .addCase(editTask.pending, (state, action) => {
        state.status = "loading";
        state.error = null;
        state.mutationRequestId = action.meta.requestId;
      })
      .addCase(editTask.fulfilled, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) {
          return;
        }

        const index = state.items.findIndex((task) => task.id === action.payload.id);
        if (index >= 0) {
          state.items[index] = action.payload;
        }
        state.status = "succeeded";
        state.error = null;
        state.mutationRequestId = null;
      })
      .addCase(editTask.rejected, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) {
          return;
        }

        state.status = "failed";
        state.error = action.payload ?? "Unable to update the task.";
        state.mutationRequestId = null;
      })
      .addCase(removeTask.pending, (state, action) => {
        state.status = "loading";
        state.error = null;
        state.mutationRequestId = action.meta.requestId;
      })
      .addCase(removeTask.fulfilled, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) {
          return;
        }

        state.items = state.items.filter((task) => task.id !== action.payload);
        state.status = "succeeded";
        state.error = null;
        state.mutationRequestId = null;
      })
      .addCase(removeTask.rejected, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) {
          return;
        }

        state.status = "failed";
        state.error = action.payload ?? "Unable to delete the task.";
        state.mutationRequestId = null;
      })
      .addCase(loadTask.pending, (state, action) => {
        state.detailStatus = "loading";
        state.detailError = null;
        state.detailRequestId = action.meta.requestId;
      })
      .addCase(loadTask.fulfilled, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) {
          return;
        }

        state.detailStatus = "succeeded";
        state.detail = action.payload;
        state.detailRequestId = null;
      })
      .addCase(loadTask.rejected, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) {
          return;
        }

        state.detailStatus = "failed";
        state.detailError = action.payload ?? "Unable to load the task.";
        state.detailRequestId = null;
      });
  },
});

export default tasksSlice.reducer;
