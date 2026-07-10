import type { CreateTaskRequest, Task, TaskStatus, UpdateTaskRequest } from '@ai-life/shared';
import { apiClient } from './client';

export const tasksService = {
  async list(status?: TaskStatus | 'all'): Promise<Task[]> {
    const params = status && status !== 'all' ? { status } : undefined;
    const { data } = await apiClient.get('/tasks', { params });
    return data.data.tasks as Task[];
  },

  async create(payload: CreateTaskRequest): Promise<Task> {
    const { data } = await apiClient.post('/tasks', payload);
    return data.data.task as Task;
  },

  async update(id: string, payload: UpdateTaskRequest): Promise<Task> {
    const { data } = await apiClient.patch(`/tasks/${id}`, payload);
    return data.data.task as Task;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/tasks/${id}`);
  },
};
