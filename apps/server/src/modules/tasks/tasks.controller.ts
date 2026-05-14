import { Request, Response, NextFunction } from 'express';
import { tasksService } from './tasks.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/utils/response';
import { TaskStatus } from '@ai-life/shared';

export const tasksController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await tasksService.create(req.user!.userId, req.body);
      sendCreated(res, { task });
    } catch (error) { next(error); }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, page, limit } = req.query as {
        status?: TaskStatus; page?: string; limit?: string;
      };
      const tasks = await tasksService.list(
        req.user!.userId,
        status,
        Number(page) || 1,
        Number(limit) || 50
      );
      sendSuccess(res, { tasks });
    } catch (error) { next(error); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await tasksService.getById(req.params.id as string, req.user!.userId);
      sendSuccess(res, { task });
    } catch (error) { next(error); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await tasksService.update(req.params.id as string, req.user!.userId, req.body);
      sendSuccess(res, { task });
    } catch (error) { next(error); }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await tasksService.delete(req.params.id as string, req.user!.userId);
      sendNoContent(res);
    } catch (error) { next(error); }
  },
};
