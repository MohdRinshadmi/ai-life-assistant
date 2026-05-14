import { apiClient } from '../../../services/api/client';
import { KnowledgeItem, CreateKnowledgeItemRequest, UpdateKnowledgeItemRequest } from '@ai-life/shared';

interface ListResponse { items: KnowledgeItem[] }
interface ItemResponse { item: KnowledgeItem }

export const knowledgeService = {
  async list(page = 1, limit = 50): Promise<KnowledgeItem[]> {
    const { data } = await apiClient.get<{ data: ListResponse }>('/knowledge', {
      params: { page, limit },
    });
    return data.data.items;
  },

  async create(payload: CreateKnowledgeItemRequest): Promise<KnowledgeItem> {
    const { data } = await apiClient.post<{ data: ItemResponse }>('/knowledge', payload);
    return data.data.item;
  },

  async update(id: string, payload: UpdateKnowledgeItemRequest): Promise<KnowledgeItem> {
    const { data } = await apiClient.patch<{ data: ItemResponse }>(`/knowledge/${id}`, payload);
    return data.data.item;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/knowledge/${id}`);
  },
};
