import type { Task, TaskInput, TaskListParams } from "./types";
import {
  getSafeHttpErrorMessage,
  getValidationResponseMessage,
} from "../apiErrors";

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? "https://ts.idicorp.ir"
).replace(/\/+$/, "");

export class TaskApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TaskApiError";
    this.status = status;
  }
}

type ResponseRecord = Record<string, string | number | boolean | null>;

function isRecord(value: object): value is ResponseRecord {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function isTask(value: object): value is Task {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    typeof value.completed === "boolean" &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
}

async function readResponse(response: Response): Promise<object | null> {
  let text: string;
  try {
    text = await response.text();
  } catch {
    throw new TaskApiError("The server response could not be read.", response.status);
  }

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as object;
  } catch {
    throw new TaskApiError("The server returned invalid JSON.", response.status);
  }
}

function validateTaskInput(input: TaskInput): void {
  if (!input.title.trim()) {
    throw new TaskApiError("A title is required.", 0);
  }

  if (input.title.length > 120) {
    throw new TaskApiError("Title must be 120 characters or fewer.", 0);
  }

  if (input.description.length > 2000) {
    throw new TaskApiError(
      "Description must be 2000 characters or fewer.",
      0,
    );
  }
}

async function request(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<object | null> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options?.headers ?? {}),
      },
    });
  } catch {
    throw new TaskApiError("Unable to connect to the task service.", 0);
  }

  if (!response.ok) {
    const fallback = "The task request failed.";
    throw new TaskApiError(
      response.status === 422
        ? await getValidationResponseMessage(
            response,
            {
              task_id: "task ID",
              q: "search query",
              completed: "completion filter",
              title: "title",
              description: "description",
            },
            "Some task fields are invalid. Review your input and try again.",
          )
        : getSafeHttpErrorMessage(response.status, fallback),
      response.status,
    );
  }

  return readResponse(response);
}

export async function fetchTasks(
  token: string,
  params: TaskListParams,
): Promise<Task[]> {
  const query = new URLSearchParams();

  if (params.completed !== undefined) {
    query.set("completed", String(params.completed));
  }

  if (params.q) {
    query.set("q", params.q);
  }

  const queryString = query.toString();
  const body = await request(
    `/api/tasks${queryString ? `?${queryString}` : ""}`,
    token,
  );

  if (!Array.isArray(body) || !body.every(isTask)) {
    throw new TaskApiError("The task list response was malformed.", 200);
  }

  return body;
}

export async function fetchTask(token: string, id: number): Promise<Task> {
  const body = await request(`/api/tasks/${encodeURIComponent(id)}`, token);

  if (!body || !isTask(body)) {
    throw new TaskApiError("The task response was malformed.", 200);
  }

  return body;
}

export async function createTask(token: string, input: TaskInput): Promise<Task> {
  validateTaskInput(input);
  const body = await request("/api/tasks", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!body || !isTask(body)) {
    throw new TaskApiError("The created task response was malformed.", 200);
  }

  return body;
}

export async function updateTask(
  token: string,
  id: number,
  input: TaskInput,
): Promise<Task> {
  validateTaskInput(input);
  if (typeof input.completed !== "boolean") {
    throw new TaskApiError("A completion status is required.", 0);
  }

  const body = await request(`/api/tasks/${encodeURIComponent(id)}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!body || !isTask(body)) {
    throw new TaskApiError("The updated task response was malformed.", 200);
  }

  return body;
}

export async function deleteTask(token: string, id: number): Promise<number> {
  await request(`/api/tasks/${encodeURIComponent(id)}`, token, {
    method: "DELETE",
  });
  return id;
}
