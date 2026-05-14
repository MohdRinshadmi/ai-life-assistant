import { Request, Response, NextFunction } from 'express';
import { chatService } from './chat.service';
import { sendSuccess, sendNoContent } from '../../shared/utils/response';

export const chatController = {
  async listConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const conversations = await chatService.listConversations(userId, page, limit);

      sendSuccess(res, { conversations });
    } catch (error) {
      next(error);
    }
  },

  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const conversationId = req.params.conversationId as string;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;

      const messages = await chatService.getMessages(conversationId, userId, page, limit);

      sendSuccess(res, { messages });
    } catch (error) {
      next(error);
    }
  },

  async deleteConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const conversationId = req.params.conversationId as string;

      await chatService.deleteConversation(conversationId, userId);

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  },
};
