import { create } from 'zustand';
import { Task, TaskStatus, CreateTaskRequest, UpdateTaskRequest } from '@ai-life/shared';
import { taskService } from '../services/taskService';

/**
 * Tasks Store — Zustand
 *
 * Owns the task list + the active status filter. Mutations are optimistic:
 * we update the cache immediately, fire the network call, and roll back to
 * the pre-mutation snapshot if the request fails. This keeps the UI snappy
 * while staying consistent with the server.
 */

export type StatusFilter = TaskStatus | 'all';

interface TasksState {
  tasks: Task[];
  statusFilter: StatusFilter;
  loading: boolean;
  error: string | null;

  load: (filter?: StatusFilter) => Promise<void>;
  create: (payload: CreateTaskRequest) => Promise<Task | null>;
  update: (id: string, payload: UpdateTaskRequest) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const toServiceStatus = (filter: StatusFilter): TaskStatus | undefined =>
  filter === 'all' ? undefined : filter;

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  statusFilter: 'all',
  loading: false,
  error: null,

  load: async (filter) => {
    const statusFilter = filter ?? get().statusFilter;
    set({ loading: true, error: null, statusFilter });
    try {
      const tasks = await taskService.list(toServiceStatus(statusFilter));
      set({ tasks, loading: false });
    } catch {
      set({ error: 'Failed to load tasks', loading: false });
    }
  },

  create: async (payload) => {
    try {
      const task = await taskService.create(payload);
      // Respect the active filter: only show the new task if it belongs here.
      const { statusFilter } = get();
      if (statusFilter === 'all' || statusFilter === task.status) {
        set((s) => ({ tasks: [task, ...s.tasks] }));
      }
      return task;
    } catch {
      set({ error: 'Failed to create task' });
      return null;
    }
  },

  update: async (id, payload) => {
    const snapshot = get().tasks;
    const target = snapshot.find((t) => t.id === id);
    if (!target) return;

    // Optimistic merge.
    const optimistic: Task = {
      ...target,
      ...payload,
      description:
        payload.description === undefined ? target.description : payload.description,
    };
    set({ tasks: snapshot.map((t) => (t.id === id ? optimistic : t)) });

    try {
      const updated = await taskService.update(id, payload);
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
    } catch {
      set({ tasks: snapshot, error: 'Failed to update task' });
    }
  },

  toggleComplete: async (id) => {
    const target = get().tasks.find((t) => t.id === id);
    if (!target) return;
    const nextStatus: TaskStatus =
      target.status === 'completed' ? 'pending' : 'completed';
    await get().update(id, { status: nextStatus });
  },

  remove: async (id) => {
    const snapshot = get().tasks;
    set({ tasks: snapshot.filter((t) => t.id !== id) });
    try {
      await taskService.remove(id);
    } catch {
      set({ tasks: snapshot, error: 'Failed to delete task' });
    }
  },
}));
