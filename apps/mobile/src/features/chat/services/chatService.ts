import { apiClient } from '@services/api/client';
import { Conversation, Message } from '@ai-life/shared';

/**
 * chatService — REST for conversation history.
 *
 * Streaming sends do NOT live here: they go over Socket.io
 * (see useChat + @services/socket/socketService). This service only
 * covers the read side — listing past conversations and hydrating the
 * message history for one of them.
 *
 * REST responses are shaped { success: boolean, data: { ... } }.
 */
interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

export const chatService = {
  /** GET /conversations — most-recent-first list of the user's conversations. */
  async listConversations(): Promise<Conversation[]> {
    const { data } = await apiClient.get<ApiWrapper<{ conversations: Conversation[] }>>(
      '/conversations'
    );
    return data.data.conversations;
  },

  /** GET /conversations/:id/messages — full message history for a conversation. */
  async getMessages(conversationId: string): Promise<Message[]> {
    const { data } = await apiClient.get<ApiWrapper<{ messages: Message[] }>>(
      `/conversations/${conversationId}/messages`
    );
    return data.data.messages;
  },

  /** DELETE /conversations/:id — permanently remove a conversation. */
  async deleteConversation(conversationId: string): Promise<void> {
    await apiClient.delete(`/conversations/${conversationId}`);
  },
};
