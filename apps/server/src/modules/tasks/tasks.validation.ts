import { z } from 'zod';

const priorities = z.enum(['low', 'medium', 'high']);
const statuses = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);

export const createTaskSchema = {
  body: z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(5000).optional(),
    priority: priorities.optional(),
    dueDate: z.string().datetime({ offset: true }).optional(),
  }),
};

export const updateTaskSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).nullable().optional(),
    status: statuses.optional(),
    priority: priorities.optional(),
    dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  }),
};

export const taskParamsSchema = {
  params: z.object({ id: z.string().uuid() }),
};

export const listTasksSchema = {
  query: z.object({
    status: statuses.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
};
