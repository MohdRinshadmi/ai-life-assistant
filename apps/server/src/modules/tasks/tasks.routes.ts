import { Router } from 'express';
import { authenticate, validate } from '@middleware';
import { tasksController } from './tasks.controller';
import {
  createTaskSchema,
  updateTaskSchema,
  taskParamsSchema,
  listTasksSchema,
} from './tasks.validation';

export const taskRoutes = Router();

taskRoutes.use(authenticate);

taskRoutes.post('/', validate(createTaskSchema), tasksController.create);
taskRoutes.get('/', validate(listTasksSchema), tasksController.list);
taskRoutes.get('/:id', validate(taskParamsSchema), tasksController.getById);
taskRoutes.patch('/:id', validate(updateTaskSchema), tasksController.update);
taskRoutes.delete('/:id', validate(taskParamsSchema), tasksController.delete);
