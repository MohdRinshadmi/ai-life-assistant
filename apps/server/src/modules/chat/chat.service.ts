import { NotFoundError, ForbiddenError } from '../../shared/errors';
import { chatRepository } from './chat.repository';
import { buildContextMessages, LLMMessage, StreamCallbacks, streamChatCompletion } from '../../shared/services/llm.service';
import { knowledgeService } from '../knowledge/knowledge.service';
import { logger } from '../../config';

export const chatService = {
  async getOrCreateConversation(userId: string, conversationId?: string) {
    if (conversationId) {
      const conv = await chatRepository.findConversationById(conversationId, userId);
      if (!conv) throw new NotFoundError('Conversation');
      if (conv.userId !== userId) throw new ForbiddenError();
      return conv;
    }
    return chatRepository.createConversation({ userId, title: 'New conversation' });
  },

  async listConversations(userId: string, page: number, limit: number) {
    return chatRepository.listConversations(userId, limit, (page - 1) * limit);
  },

  async getMessages(conversationId: string, userId: string, page: number, limit: number) {
    const conv = await chatRepository.findConversationById(conversationId, userId);
    if (!conv) throw new NotFoundError('Conversation');
    const rows = await chatRepository.listMessages(conversationId, limit, (page - 1) * limit);
    return rows.reverse();
  },

  async deleteConversation(conversationId: string, userId: string) {
    const conv = await chatRepository.findConversationById(conversationId, userId);
    if (!conv) throw new NotFoundError('Conversation');
    await chatRepository.deleteConversation(conversationId, userId);
  },

  /**
   * Core chat flow with RAG:
   * 1. Resolve or create conversation
   * 2. Persist user message
   * 3. RAG retrieval — embed query → vector search → top-3 knowledge items
   * 4. Build conversation history context (trimmed to token budget)
   * 5. Stream LLM response with RAG context injected into system prompt
   * 6. Persist full assistant response on completion
   *
   * RAG runs in parallel with conversation history loading so it doesn't
   * add latency to the critical path (both are async I/O).
   */
  async streamResponse(
    userId: string,
    content: string,
    conversationId: string | undefined,
    callbacks: StreamCallbacks & {
      onConversationReady: (conversationId: string, userMessageId: string, assistantMessageId: string) => void;
    }
  ) {
    const conversation = await this.getOrCreateConversation(userId, conversationId);

    if (conversation.messageCount === 0) {
      const title = content.length > 60 ? `${content.slice(0, 57)}...` : content;
      await chatRepository.updateConversationStats(conversation.id);
      conversation.title = title;
    }

    const userMessage = await chatRepository.createMessage({
      conversationId: conversation.id,
      role: 'user',
      content,
    });

    const assistantMessage = await chatRepository.createMessage({
      conversationId: conversation.id,
      role: 'assistant',
      content: '',
    });

    callbacks.onConversationReady(conversation.id, userMessage.id, assistantMessage.id);

    // Run history load and RAG retrieval in parallel — neither depends on the other
    const [history, ragResults] = await Promise.all([
      chatRepository.getRecentMessages(conversation.id, 20),
      knowledgeService.retrieveContext(userId, content, 3),
    ]);

    if (ragResults.length > 0) {
      logger.info({ msg: 'RAG context retrieved', userId, count: ragResults.length });
    }

    const contextMessages: LLMMessage[] = buildContextMessages(
      history
        .filter((m) => m.id !== assistantMessage.id)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    );

    // Format retrieved chunks for the system prompt
    const ragContext = ragResults.length > 0
      ? ragResults
          .map((r, i) => `[Note ${i + 1}: "${r.title}"]\n${r.content}`)
          .join('\n\n')
      : undefined;

    await streamChatCompletion(contextMessages, {
      onToken: callbacks.onToken,
      onError: callbacks.onError,
      onDone: async (fullText, _inputTokens, outputTokens) => {
        await chatRepository.createMessage({
          conversationId: conversation.id,
          role: 'assistant',
          content: fullText,
          tokenCount: outputTokens,
        });
        await chatRepository.updateConversationStats(conversation.id);
        callbacks.onDone(fullText, _inputTokens, outputTokens);
      },
    }, ragContext);
  },
};
