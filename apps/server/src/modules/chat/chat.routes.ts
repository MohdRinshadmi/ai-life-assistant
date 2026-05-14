import { Router } from 'express';
import { authenticate } from '../../middleware';
import { validate } from '../../middleware';
import { chatController } from './chat.controller';
import {
  listConversationsSchema,
  getMessagesSchema,
  deleteConversationSchema,
} from './chat.validation';

export const chatRoutes = Router();

chatRoutes.use(authenticate);

chatRoutes.get('/', validate(listConversationsSchema), chatController.listConversations);

chatRoutes.get(
  '/:conversationId/messages',
  validate(getMessagesSchema),
  chatController.getMessages
);

chatRoutes.delete(
  '/:conversationId',
  validate(deleteConversationSchema),
  chatController.deleteConversation
);
