import { create } from 'zustand';
import type { Message } from '@ai-life/shared';

export type UIMessage = Omit<Message, 'tokenCount'> & { isStreaming?: boolean };

interface ChatState {
  conversationId: string | null;
  messages: UIMessage[];
  isAssistantTyping: boolean;
  error: string | null;
  setConversationId: (id: string | null) => void;
  appendUserMessage: (content: string, id?: string) => void;
  startAssistant: (assistantMessageId: string) => void;
  appendToken: (token: string) => void;
  finishAssistant: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversationId: null,
  messages: [],
  isAssistantTyping: false,
  error: null,

  setConversationId: (conversationId) => set({ conversationId }),

  appendUserMessage: (content, id) =>
    set((s) => ({
      error: null,
      messages: [
        ...s.messages,
        {
          id: id ?? `local-${s.messages.length}-${content.length}`,
          conversationId: s.conversationId ?? '',
          role: 'user',
          content,
          createdAt: new Date().toISOString(),
        },
      ],
    })),

  startAssistant: (assistantMessageId) =>
    set((s) => ({
      isAssistantTyping: true,
      messages: [
        ...s.messages,
        {
          id: assistantMessageId,
          conversationId: s.conversationId ?? '',
          role: 'assistant',
          content: '',
          createdAt: new Date().toISOString(),
          isStreaming: true,
        },
      ],
    })),

  appendToken: (token) =>
    set((s) => {
      const messages = [...s.messages];
      const last = messages[messages.length - 1];
      if (last?.role === 'assistant' && last.isStreaming) {
        messages[messages.length - 1] = { ...last, content: last.content + token };
      }
      return { messages };
    }),

  finishAssistant: () =>
    set((s) => ({
      isAssistantTyping: false,
      messages: s.messages.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
    })),

  setError: (error) => set({ error, isAssistantTyping: false }),

  reset: () => set({ conversationId: null, messages: [], isAssistantTyping: false, error: null }),
}));
