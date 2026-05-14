import { Router } from 'express';
import { authenticate, validate } from '../../middleware';
import { knowledgeController } from './knowledge.controller';
import {
  createKnowledgeItemSchema,
  updateKnowledgeItemSchema,
  knowledgeItemParamsSchema,
  listKnowledgeItemsSchema,
} from './knowledge.validation';

export const knowledgeRoutes = Router();

knowledgeRoutes.use(authenticate);

knowledgeRoutes.post('/', validate(createKnowledgeItemSchema), knowledgeController.create);
knowledgeRoutes.get('/', validate(listKnowledgeItemsSchema), knowledgeController.list);
knowledgeRoutes.get('/:id', validate(knowledgeItemParamsSchema), knowledgeController.getById);
knowledgeRoutes.patch('/:id', validate(updateKnowledgeItemSchema), knowledgeController.update);
knowledgeRoutes.delete('/:id', validate(knowledgeItemParamsSchema), knowledgeController.delete);
