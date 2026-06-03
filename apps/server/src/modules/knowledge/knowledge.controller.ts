import { Request, Response, NextFunction } from 'express';
import { knowledgeService } from './knowledge.service';
import { sendSuccess, sendCreated, sendNoContent } from '@shared/utils/response';

export const knowledgeController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await knowledgeService.create(req.user!.userId, req.body);
      sendCreated(res, { item });
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const items = await knowledgeService.list(req.user!.userId, page, limit);
      sendSuccess(res, { items });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await knowledgeService.getById(req.params.id as string, req.user!.userId);
      sendSuccess(res, { item });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await knowledgeService.update(req.params.id as string, req.user!.userId, req.body);
      sendSuccess(res, { item });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await knowledgeService.delete(req.params.id as string, req.user!.userId);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  },
};
