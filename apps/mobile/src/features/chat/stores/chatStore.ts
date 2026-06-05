import { create } from 'zustand';
import { Message } from '@ai-life/shared';

/**
 * Chat Store — Zustand
 *
 * Holds the live conversation: the current conversationId, the message
 * list, and whether the assistant is mid-stream. The socket wiring lives
 * in useChat; this store is the single source of truth it writes into so
 * any screen/component can read the same conversation state.
 *
 * `UIMessage` is a UI-only superset of the shared Message: it drops the
 * server-only `tokenCount` and adds a transient `isStreaming` flag for the
 * bubble being typed out.
 */
export interface UIMessage extends Omit<Message, 'tokenCount'> {
  isStreaming?: boolean;
}

interface ChatState {
  // State
  conversationId: string | null;
  messages: UIMessage[];
  isAssistantTyping: boolean;
  error: string | null;

  // Actions
  setConversationId: (id: string | null) => void;
  setMessages: (messages: UIMessage[]) => void;
  appendUserMessage: (content: string) => void;
  startAssistant: (payload: {
    conversationId: string;
    assistantMessageId: string;
  }) => void;
  appendToken: (token: string) => void;
  finishAssistant: () => void;
  setError: (message: string | null) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  // Initial state
  conversationId: null,
  messages: [],
  isAssistantTyping: false,
  error: null,

  // Actions
  setConversationId: (conversationId) => set({ conversationId }),

  setMessages: (messages) => set({ messages }),

  appendUserMessage: (content) =>
    set((state) => ({
      error: null,
      isAssistantTyping: true,
      messages: [
        ...state.messages,
        {
          // Optimistic local id — replaced implicitly once history reloads.
          id: `local-${Date.now()}`,
          conversationId: state.conversationId ?? '',
          role: 'user',
          content,
          createdAt: new Date().toISOString(),
        },
      ],
    })),

  startAssistant: ({ conversationId, assistantMessageId }) =>
    set((state) => ({
      conversationId,
      isAssistantTyping: true,
      messages: [
        ...state.messages,
        {
          id: assistantMessageId,
          conversationId,
          role: 'assistant',
          content: '',
          createdAt: new Date().toISOString(),
          isStreaming: true,
        },
      ],
    })),

  appendToken: (token) =>
    set((state) => {
      // The streaming bubble is always the last assistant message.
      const messages = state.messages.slice();
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].isStreaming) {
          messages[i] = { ...messages[i], content: messages[i].content + token };
          break;
        }
      }
      return { messages };
    }),

  finishAssistant: () =>
    set((state) => ({
      isAssistantTyping: false,
      messages: state.messages.map((m) =>
        m.isStreaming ? { ...m, isStreaming: false } : m
      ),
    })),

  setError: (error) =>
    set((state) => ({
      error,
      isAssistantTyping: false,
      // Drop the empty assistant placeholder if the stream never produced text.
      messages: error
        ? state.messages.filter((m) => !(m.isStreaming && m.content === ''))
        : state.messages,
    })),

  reset: () =>
    set({
      conversationId: null,
      messages: [],
      isAssistantTyping: false,
      error: null,
    }),
}));
