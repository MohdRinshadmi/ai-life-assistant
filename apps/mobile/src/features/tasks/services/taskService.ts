import { apiClient } from '@services/api/client';
import { Task, TaskStatus, TaskPriority } from '@ai-life/shared';

interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

export const taskService = {
  async list(status?: TaskStatus): Promise<Task[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    const { data } = await apiClient.get<ApiWrapper<{ tasks: Task[] }>>('/tasks', { params });
    return data.data.tasks;
  },

  async create(payload: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
  }): Promise<Task> {
    const { data } = await apiClient.post<ApiWrapper<{ task: Task }>>('/tasks', payload);
    return data.data.task;
  },

  async update(id: string, payload: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
  }): Promise<Task> {
    const { data } = await apiClient.patch<ApiWrapper<{ task: Task }>>(`/tasks/${id}`, payload);
    return data.data.task;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/tasks/${id}`);
  },
};
