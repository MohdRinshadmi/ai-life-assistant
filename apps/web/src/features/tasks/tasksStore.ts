import { create } from 'zustand';
import type { CreateTaskRequest, Task, TaskStatus, UpdateTaskRequest } from '@ai-life/shared';
import { tasksService } from '@/services/api/tasksService';
import { getApiErrorMessage } from '@/services/api/client';

export type TaskFilter = TaskStatus | 'all';

interface TasksState {
  tasks: Task[];
  statusFilter: TaskFilter;
  loading: boolean;
  error: string | null;
  load: (filter?: TaskFilter) => Promise<void>;
  create: (payload: CreateTaskRequest) => Promise<void>;
  update: (id: string, payload: UpdateTaskRequest) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Merge a task pushed by the server (task:created socket event). */
  upsert: (task: Task) => void;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  statusFilter: 'all',
  loading: false,
  error: null,

  load: async (filter) => {
    const statusFilter = filter ?? get().statusFilter;
    set({ loading: true, error: null, statusFilter });
    try {
      const tasks = await tasksService.list(statusFilter);
      set({ tasks, loading: false });
    } catch (err) {
      set({ error: getApiErrorMessage(err), loading: false });
    }
  },

  create: async (payload) => {
    const task = await tasksService.create(payload);
    set((s) => ({ tasks: [task, ...s.tasks] }));
  },

  update: async (id, payload) => {
    const prev = get().tasks;
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? ({ ...t, ...payload } as Task) : t)),
    }));
    try {
      const task = await tasksService.update(id, payload);
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? task : t)) }));
    } catch (err) {
      set({ tasks: prev, error: getApiErrorMessage(err) });
    }
  },

  toggleComplete: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const status: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    await get().update(id, { status });
  },

  remove: async (id) => {
    const prev = get().tasks;
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    try {
      await tasksService.remove(id);
    } catch (err) {
      set({ tasks: prev, error: getApiErrorMessage(err) });
    }
  },

  upsert: (task) =>
    set((s) => ({
      tasks: s.tasks.some((t) => t.id === task.id)
        ? s.tasks.map((t) => (t.id === task.id ? task : t))
        : [task, ...s.tasks],
    })),
}));
