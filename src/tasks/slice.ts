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
  hasLoaded: boolean;
  detail: Task | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  detailStatus: "idle" | "loading" | "succeeded" | "failed";
  detailError: string | null;
  listRequestId: string | null;
  listRequestVersion: number | null;
  detailRequestId: string | null;
  detailTaskId: number | null;
  mutationRequestIds: string[];
  mutationVersion: number;
  pendingMutationCount: number;
};

const initialState: TaskState = {
  items: [],
  hasLoaded: false,
  detail: null,
  status: "idle",
  error: null,
  detailStatus: "idle",
  detailError: null,
  listRequestId: null,
  listRequestVersion: null,
  detailRequestId: null,
  detailTaskId: null,
  mutationRequestIds: [],
  mutationVersion: 0,
  pendingMutationCount: 0,
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
  let token: string;
  try {
    token = requireToken(getState());
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error instanceof Error ? error : new Error()),
    );
  }
  try {
    return await fetchTasks(token, params);
  } catch (error) {
    if (
      error instanceof TaskApiError &&
      error.status === 401 &&
      getState().auth.accessToken === token
    ) {
      dispatch(clearSession());
    }
    return rejectWithValue(
      getErrorMessage(error instanceof Error ? error : new Error()),
    );
  }
});

export const loadTask = createAsyncThunk<Task, number, ThunkConfig>(
  "tasks/loadTask",
  async (id, { dispatch, getState, rejectWithValue }) => {
    let token: string;
    try {
      token = requireToken(getState());
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error instanceof Error ? error : new Error()),
      );
    }
    try {
      return await fetchTask(token, id);
    } catch (error) {
      if (
        error instanceof TaskApiError &&
        error.status === 401 &&
        getState().auth.accessToken === token
      ) {
        dispatch(clearSession());
      }
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
    let token: string;
    try {
      token = requireToken(getState());
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error instanceof Error ? error : new Error()),
      );
    }
    try {
      return await createTask(token, input);
    } catch (error) {
      if (
        error instanceof TaskApiError &&
        error.status === 401 &&
        getState().auth.accessToken === token
      ) {
        dispatch(clearSession());
      }
      return rejectWithValue(
        getErrorMessage(error instanceof Error ? error : new Error()),
      );
    }
  },
);

export const editTask = createAsyncThunk<Task, TaskMutation, ThunkConfig>(
  "tasks/editTask",
  async ({ id, input }, { dispatch, getState, rejectWithValue }) => {
    let token: string;
    try {
      token = requireToken(getState());
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error instanceof Error ? error : new Error()),
      );
    }
    try {
      return await updateTask(token, id, input);
    } catch (error) {
      if (
        error instanceof TaskApiError &&
        error.status === 401 &&
        getState().auth.accessToken === token
      ) {
        dispatch(clearSession());
      }
      return rejectWithValue(
        getErrorMessage(error instanceof Error ? error : new Error()),
      );
    }
  },
);

export const removeTask = createAsyncThunk<number, number, ThunkConfig>(
  "tasks/removeTask",
  async (id, { dispatch, getState, rejectWithValue }) => {
    let token: string;
    try {
      token = requireToken(getState());
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error instanceof Error ? error : new Error()),
      );
    }
    try {
      return await deleteTask(token, id);
    } catch (error) {
      if (
        error instanceof TaskApiError &&
        error.status === 401 &&
        getState().auth.accessToken === token
      ) {
        dispatch(clearSession());
      }
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
        state.hasLoaded = false;
        state.detail = null;
        state.status = "idle";
        state.error = null;
        state.detailStatus = "idle";
        state.detailError = null;
        state.listRequestId = null;
        state.listRequestVersion = null;
        state.detailRequestId = null;
        state.detailTaskId = null;
        state.mutationRequestIds = [];
        state.mutationVersion = 0;
        state.pendingMutationCount = 0;
      })
      .addCase(loadTasks.pending, (state, action) => {
        state.status = "loading";
        state.error = null;
        state.listRequestId = action.meta.requestId;
        state.listRequestVersion = state.mutationVersion;
      })
      .addCase(loadTasks.fulfilled, (state, action) => {
        if (
          state.listRequestId !== action.meta.requestId ||
          state.listRequestVersion !== state.mutationVersion
        ) {
          return;
        }

        state.status =
          state.pendingMutationCount > 0 ? "loading" : "succeeded";
        state.items = action.payload;
        state.hasLoaded = true;
        state.listRequestId = null;
        state.listRequestVersion = null;
      })
      .addCase(loadTasks.rejected, (state, action) => {
        if (
          state.listRequestId !== action.meta.requestId ||
          state.listRequestVersion !== state.mutationVersion
        ) {
          return;
        }

        state.status =
          state.pendingMutationCount > 0 ? "loading" : "failed";
        state.error = action.payload ?? "Unable to load tasks.";
        state.listRequestId = null;
        state.listRequestVersion = null;
      })
      .addCase(addTask.pending, (state, action) => {
        state.status = "loading";
        state.error = null;
        state.listRequestId = null;
        state.listRequestVersion = null;
        state.mutationVersion += 1;
        state.mutationRequestIds.push(action.meta.requestId);
        state.pendingMutationCount += 1;
      })
      .addCase(addTask.fulfilled, (state, action) => {
        const requestIndex = state.mutationRequestIds.indexOf(action.meta.requestId);
        if (requestIndex < 0) {
          return;
        }

        state.mutationRequestIds.splice(requestIndex, 1);
        state.pendingMutationCount -= 1;
        state.mutationVersion += 1;
        state.listRequestId = null;
        state.listRequestVersion = null;
        state.items.unshift(action.payload);
        state.status =
          state.pendingMutationCount > 0 || state.listRequestId !== null
            ? "loading"
            : "succeeded";
        state.error = null;
      })
      .addCase(addTask.rejected, (state, action) => {
        const requestIndex = state.mutationRequestIds.indexOf(action.meta.requestId);
        if (requestIndex < 0) {
          return;
        }

        state.mutationRequestIds.splice(requestIndex, 1);
        state.pendingMutationCount -= 1;
        state.mutationVersion += 1;
        state.listRequestId = null;
        state.listRequestVersion = null;
        state.status =
          state.pendingMutationCount > 0 || state.listRequestId !== null
            ? "loading"
            : "failed";
        state.error = action.payload ?? "Unable to create the task.";
      })
      .addCase(editTask.pending, (state, action) => {
        state.status = "loading";
        state.error = null;
        state.listRequestId = null;
        state.listRequestVersion = null;
        state.mutationVersion += 1;
        state.mutationRequestIds.push(action.meta.requestId);
        state.pendingMutationCount += 1;
      })
      .addCase(editTask.fulfilled, (state, action) => {
        const requestIndex = state.mutationRequestIds.indexOf(action.meta.requestId);
        if (requestIndex < 0) {
          return;
        }

        state.mutationRequestIds.splice(requestIndex, 1);
        state.pendingMutationCount -= 1;
        state.mutationVersion += 1;
        state.listRequestId = null;
        state.listRequestVersion = null;
        const index = state.items.findIndex((task) => task.id === action.payload.id);
        if (index >= 0) {
          state.items[index] = action.payload;
        }
        state.status =
          state.pendingMutationCount > 0 || state.listRequestId !== null
            ? "loading"
            : "succeeded";
        state.error = null;
      })
      .addCase(editTask.rejected, (state, action) => {
        const requestIndex = state.mutationRequestIds.indexOf(action.meta.requestId);
        if (requestIndex < 0) {
          return;
        }

        state.mutationRequestIds.splice(requestIndex, 1);
        state.pendingMutationCount -= 1;
        state.mutationVersion += 1;
        state.listRequestId = null;
        state.listRequestVersion = null;
        state.status =
          state.pendingMutationCount > 0 || state.listRequestId !== null
            ? "loading"
            : "failed";
        state.error = action.payload ?? "Unable to update the task.";
      })
      .addCase(removeTask.pending, (state, action) => {
        state.status = "loading";
        state.error = null;
        state.listRequestId = null;
        state.listRequestVersion = null;
        state.mutationVersion += 1;
        state.mutationRequestIds.push(action.meta.requestId);
        state.pendingMutationCount += 1;
        if (state.detailTaskId === action.meta.arg) {
          state.detail = null;
          state.detailStatus = "idle";
          state.detailError = null;
          state.detailRequestId = null;
          state.detailTaskId = null;
        }
      })
      .addCase(removeTask.fulfilled, (state, action) => {
        const requestIndex = state.mutationRequestIds.indexOf(action.meta.requestId);
        if (requestIndex < 0) {
          return;
        }

        state.mutationRequestIds.splice(requestIndex, 1);
        state.pendingMutationCount -= 1;
        state.mutationVersion += 1;
        state.listRequestId = null;
        state.listRequestVersion = null;
        state.items = state.items.filter((task) => task.id !== action.payload);
        state.status =
          state.pendingMutationCount > 0 || state.listRequestId !== null
            ? "loading"
            : "succeeded";
        state.error = null;
      })
      .addCase(removeTask.rejected, (state, action) => {
        const requestIndex = state.mutationRequestIds.indexOf(action.meta.requestId);
        if (requestIndex < 0) {
          return;
        }

        state.mutationRequestIds.splice(requestIndex, 1);
        state.pendingMutationCount -= 1;
        state.mutationVersion += 1;
        state.listRequestId = null;
        state.listRequestVersion = null;
        state.status =
          state.pendingMutationCount > 0 || state.listRequestId !== null
            ? "loading"
            : "failed";
        state.error = action.payload ?? "Unable to delete the task.";
      })
      .addCase(loadTask.pending, (state, action) => {
        state.detailStatus = "loading";
        state.detailError = null;
        state.detailRequestId = action.meta.requestId;
        state.detailTaskId = action.meta.arg;
      })
      .addCase(loadTask.fulfilled, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) {
          return;
        }

        state.detailStatus = "succeeded";
        state.detail = action.payload;
        state.detailRequestId = null;
        state.detailTaskId = null;
      })
      .addCase(loadTask.rejected, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) {
          return;
        }

        state.detailStatus = "failed";
        state.detailError = action.payload ?? "Unable to load the task.";
        state.detailRequestId = null;
        state.detailTaskId = null;
      });
  },
});

export default tasksSlice.reducer;
