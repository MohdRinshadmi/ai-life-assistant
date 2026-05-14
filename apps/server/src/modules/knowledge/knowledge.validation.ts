import { z } from 'zod';

export const createKnowledgeItemSchema = {
  body: z.object({
    title: z.string().min(1).max(200),
    content: z.string().min(1).max(50_000),
    source: z.enum(['note', 'task', 'import']).default('note'),
  }),
};

export const updateKnowledgeItemSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).max(50_000).optional(),
  }).refine((d) => d.title !== undefined || d.content !== undefined, {
    message: 'At least one field (title or content) must be provided',
  }),
};

export const knowledgeItemParamsSchema = {
  params: z.object({ id: z.string().uuid() }),
};

export const listKnowledgeItemsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
};
