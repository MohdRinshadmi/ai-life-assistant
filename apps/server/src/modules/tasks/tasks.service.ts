import { NotFoundError } from '../../shared/errors';
import { tasksRepository } from './tasks.repository';
import { TaskStatus, TaskPriority, Task } from '@ai-life/shared';

function toTask(row: Awaited<ReturnType<typeof tasksRepository.create>>): Task {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    dueDate: row.dueDate?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const tasksService = {
  async create(userId: string, data: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
  }): Promise<Task> {
    const row = await tasksRepository.create({
      userId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    });
    return toTask(row);
  },

  async list(userId: string, status: TaskStatus | undefined, page: number, limit: number) {
    const rows = await tasksRepository.list(userId, { status }, limit, (page - 1) * limit);
    return rows.map(toTask);
  },

  async getById(id: string, userId: string): Promise<Task> {
    const row = await tasksRepository.findById(id, userId);
    if (!row) throw new NotFoundError('Task');
    return toTask(row);
  },

  async update(id: string, userId: string, data: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
  }): Promise<Task> {
    const existing = await tasksRepository.findById(id, userId);
    if (!existing) throw new NotFoundError('Task');

    const row = await tasksRepository.update(id, userId, {
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined,
    });
    return toTask(row!);
  },

  async delete(id: string, userId: string) {
    const existing = await tasksRepository.findById(id, userId);
    if (!existing) throw new NotFoundError('Task');
    await tasksRepository.delete(id, userId);
  },
};
