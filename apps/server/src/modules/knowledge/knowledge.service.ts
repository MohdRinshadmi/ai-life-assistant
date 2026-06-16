import { NotFoundError } from '@shared/errors';
import { safeEmbedText } from '@shared/services/gemini.service';
import { knowledgeRepository } from './knowledge.repository';
import { KnowledgeSearchResult } from '@ai-life/shared';

export const knowledgeService = {
  async create(userId: string, data: { title: string; content: string; source?: string }) {
    // Embed the content immediately so it's searchable right away.
    // Failure to embed is non-fatal — item is saved without a vector and
    // excluded from search results until re-embedded.
    const embedding = await safeEmbedText(`${data.title}\n\n${data.content}`);

    return knowledgeRepository.create({
      userId,
      title: data.title,
      content: data.content,
      source: data.source ?? 'note',
      embedding,
    });
  },

  async list(userId: string, page: number, limit: number) {
    return knowledgeRepository.list(userId, limit, (page - 1) * limit);
  },

  async getById(id: string, userId: string) {
    const item = await knowledgeRepository.findById(id, userId);
    if (!item) throw new NotFoundError('Knowledge item');
    return item;
  },

  async update(id: string, userId: string, data: { title?: string; content?: string }) {
    const existing = await knowledgeRepository.findById(id, userId);
    if (!existing) throw new NotFoundError('Knowledge item');

    const newTitle = data.title ?? existing.title;
    const newContent = data.content ?? existing.content;

    // Re-embed only when content changed
    const contentChanged = data.title !== undefined || data.content !== undefined;
    const embedding = contentChanged
      ? await safeEmbedText(`${newTitle}\n\n${newContent}`)
      : undefined;

    return knowledgeRepository.update(id, userId, {
      title: data.title,
      content: data.content,
      embedding,
    });
  },

  async delete(id: string, userId: string) {
    const existing = await knowledgeRepository.findById(id, userId);
    if (!existing) throw new NotFoundError('Knowledge item');
    await knowledgeRepository.delete(id, userId);
  },

  /**
   * RAG retrieval: embed the query and return the most similar knowledge items.
   * Called by chat.service before each LLM call.
   *
   * Returns empty array (graceful degradation) when:
   * - No GEMINI_API_KEY
   * - Embedding API is down
   * - User has no knowledge items
   */
  async retrieveContext(
    userId: string,
    query: string,
    topK = 3
  ): Promise<KnowledgeSearchResult[]> {
    const embedding = await safeEmbedText(query, 'RETRIEVAL_QUERY');
    if (!embedding) return [];

    return knowledgeRepository.similaritySearch(userId, embedding, topK, 0.70);
  },
};
