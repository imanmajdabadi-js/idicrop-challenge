export type Task = {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export type TaskInput = {
  title: string;
  description: string;
  completed?: boolean;
};

export type TaskListParams = {
  completed?: boolean;
  q?: string;
};
