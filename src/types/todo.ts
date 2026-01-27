export type Priority = 'Low' | 'Medium' | 'High';

export interface Subtask {
  id: string;
  todo_id: string;
  title: string;
  completed: boolean;
  created_at: string;
  position: number;
}

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  completed: boolean;
  created_at: string;
  createdAt: number;
  due_datetime: string | null;
  dueDateTime: string | null;
  tags: string[];
  position: number;
  subtasks: Subtask[];
}

export interface NewTodo {
  title: string;
  description?: string;
  priority?: Priority;
  tags?: string[];
  dueDateTime?: string | null;
  completed?: boolean;
}

export interface TodoUpdates {
  title?: string;
  description?: string;
  priority?: Priority;
  due_datetime?: string | null;
  completed?: boolean;
  tags?: string[];
  position?: number;
}
