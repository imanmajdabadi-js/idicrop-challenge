import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../store/store";
import {
  createTask,
  deleteTask,
  fetchTask,
  fetchTasks,
  updateTask,
} from "./api";
import type { Task, TaskInput, TaskListParams } from "./types";

type TaskState = {
  items: Task[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

const initialState: TaskState = {
  items: [],
  status: "idle",
  error: null,
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

export const loadTasks = createAsyncThunk<
  Task[],
  TaskListParams,
  ThunkConfig
>("tasks/loadTasks", async (params, { getState, rejectWithValue }) => {
  try {
    return await fetchTasks(requireToken(getState()), params);
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error instanceof Error ? error : new Error()),
    );
  }
});

export const loadTask = createAsyncThunk<Task, number, ThunkConfig>(
  "tasks/loadTask",
  async (id, { getState, rejectWithValue }) => {
    try {
      return await fetchTask(requireToken(getState()), id);
    } catch (error) {
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
  async (input, { getState, rejectWithValue }) => {
    try {
      return await createTask(requireToken(getState()), input);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error instanceof Error ? error : new Error()),
      );
    }
  },
);

export const editTask = createAsyncThunk<Task, TaskMutation, ThunkConfig>(
  "tasks/editTask",
  async ({ id, input }, { getState, rejectWithValue }) => {
    try {
      return await updateTask(requireToken(getState()), id, input);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error instanceof Error ? error : new Error()),
      );
    }
  },
);

export const removeTask = createAsyncThunk<number, number, ThunkConfig>(
  "tasks/removeTask",
  async (id, { getState, rejectWithValue }) => {
    try {
      return await deleteTask(requireToken(getState()), id);
    } catch (error) {
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
      .addCase(loadTasks.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loadTasks.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(loadTasks.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Unable to load tasks.";
      })
      .addCase(addTask.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(addTask.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(addTask.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Unable to create the task.";
      })
      .addCase(editTask.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(editTask.fulfilled, (state, action) => {
        const index = state.items.findIndex((task) => task.id === action.payload.id);
        if (index >= 0) {
          state.items[index] = action.payload;
        }
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(editTask.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Unable to update the task.";
      })
      .addCase(removeTask.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(removeTask.fulfilled, (state, action) => {
        state.items = state.items.filter((task) => task.id !== action.payload);
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(removeTask.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Unable to delete the task.";
      })
      .addCase(loadTask.rejected, (state, action) => {
        state.error = action.payload ?? "Unable to load the task.";
      });
  },
});

export default tasksSlice.reducer;
