import type { KnowledgeItem, KnowledgeSearchResult } from '@ai-life/shared';
import { apiClient } from './client';

export const notesService = {
  async list(page = 1, limit = 50): Promise<KnowledgeItem[]> {
    const { data } = await apiClient.get('/knowledge', { params: { page, limit } });
    return data.data.items as KnowledgeItem[];
  },

  async search(q: string): Promise<KnowledgeSearchResult[]> {
    const { data } = await apiClient.get('/knowledge/search', { params: { q } });
    return data.data.results as KnowledgeSearchResult[];
  },

  async create(payload: { title: string; content: string }): Promise<KnowledgeItem> {
    const { data } = await apiClient.post('/knowledge', payload);
    return data.data.item as KnowledgeItem;
  },

  async update(id: string, payload: { title?: string; content?: string }): Promise<KnowledgeItem> {
    const { data } = await apiClient.patch(`/knowledge/${id}`, payload);
    return data.data.item as KnowledgeItem;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/knowledge/${id}`);
  },
};
