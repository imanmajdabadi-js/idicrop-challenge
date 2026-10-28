import { FormEvent, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { addTask, editTask, loadTasks, removeTask } from "./slice";
import type { Task, TaskInput } from "./types";

const emptyForm: TaskInput = {
  title: "",
  description: "",
  completed: false,
};

export default function TaskManager() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.tasks);
  const [search, setSearch] = useState("");
  const [completed, setCompleted] = useState("");
  const [form, setForm] = useState<TaskInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void dispatch(
      loadTasks({
        q: search.trim() || undefined,
        completed: completed ? completed === "true" : undefined,
      }),
    );
  }, [completed, dispatch, search]);

  function updateField(field: "title" | "description", value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setFormError(null);
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
    const validationError = validateForm();
    setFormError(validationError);

    if (validationError) {
      return;
    }

    if (editingId === null) {
      const result = await dispatch(addTask(form));
      if (addTask.fulfilled.match(result)) {
        resetForm();
      }
      return;
    }

    const result = await dispatch(editTask({ id: editingId, input: form }));
    if (editTask.fulfilled.match(result)) {
      resetForm();
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
  }

  async function handleDelete(id: number) {
    await dispatch(removeTask(id));
  }

  return (
    <section>
      <h2>Tasks</h2>
      <form onSubmit={handleSubmit}>
        <h3>{editingId === null ? "Create task" : "Edit task"}</h3>
        <label>
          Title
          <input
            required
            maxLength={120}
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
          />
        </label>
        <label>
          Description
          <textarea
            maxLength={2000}
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.completed ?? false}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                completed: event.target.checked,
              }))
            }
          />
          Completed
        </label>
        {formError && <p role="alert">{formError}</p>}
        <button type="submit" disabled={status === "loading"}>
          {editingId === null ? "Create task" : "Save task"}
        </button>
        {editingId !== null && (
          <button type="button" onClick={resetForm}>
            Cancel
          </button>
        )}
      </form>

      <div>
        <label>
          Search
          <input value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label>
          Completion
          <select
            value={completed}
            onChange={(event) => setCompleted(event.target.value)}
          >
            <option value="">All tasks</option>
            <option value="false">Incomplete</option>
            <option value="true">Completed</option>
          </select>
        </label>
      </div>

      {status === "loading" && <p>Loading tasks...</p>}
      {error && <p role="alert">{error}</p>}
      {status !== "loading" && items.length === 0 && <p>No tasks found.</p>}
      <ul>
        {items.map((task) => (
          <li key={task.id}>
            <strong>{task.title}</strong>
            <p>{task.description}</p>
            <span>{task.completed ? "Completed" : "Incomplete"}</span>
            <button type="button" onClick={() => startEditing(task)}>
              Edit
            </button>
            <button type="button" onClick={() => void handleDelete(task.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
