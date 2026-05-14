import { z } from 'zod';

export const listConversationsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
};

export const getMessagesSchema = {
  params: z.object({
    conversationId: z.string().uuid('Invalid conversation ID'),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
};

export const deleteConversationSchema = {
  params: z.object({
    conversationId: z.string().uuid('Invalid conversation ID'),
  }),
};
