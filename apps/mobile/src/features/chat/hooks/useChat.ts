import { useState, useEffect, useCallback, useRef } from 'react';
import { Task } from '@ai-life/shared';
import { connectSocket, getSocket } from '@services/socket/socketService';
import { useAuthStore } from '@stores/authStore';
import { useChatStore, UIMessage } from '../stores/chatStore';
import { chatService } from '../services/chatService';

// Re-exported so components keep importing the UI message type from here.
export type { UIMessage };

interface UseChatOptions {
  /** When set, the existing message history is hydrated over REST on mount. */
  conversationId?: string;
  onMessageComplete?: (text: string) => void;
}

interface UseChatReturn {
  messages: UIMessage[];
  isConnected: boolean;
  isStreaming: boolean;
  isLoadingHistory: boolean;
  error: string | null;
  conversationId: string | null;
  newTask: Task | null;
  sendMessage: (content: string) => void;
  clearError: () => void;
  clearNewTask: () => void;
}

/**
 * useChat — bridges the chat store to the Socket.io transport.
 *
 * The store owns conversation state (messages, typing flag, error); this
 * hook owns the socket lifecycle: it registers chat:* listeners that push
 * streamed tokens into the store, sends user messages, and tears listeners
 * down on unmount. REST history (chatService) hydrates the store when an
 * existing conversationId is supplied.
 */
export function useChat({
  conversationId: initialConversationId,
  onMessageComplete,
}: UseChatOptions = {}): UseChatReturn {
  const accessToken = useAuthStore((s) => s.accessToken);

  // Store selectors — components re-render only on the slices they read.
  const messages = useChatStore((s) => s.messages);
  const conversationId = useChatStore((s) => s.conversationId);
  const isStreaming = useChatStore((s) => s.isAssistantTyping);
  const error = useChatStore((s) => s.error);

  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [newTask, setNewTask] = useState<Task | null>(null);

  const onMessageCompleteRef = useRef(onMessageComplete);
  onMessageCompleteRef.current = onMessageComplete;

  // Accumulated streamed text, kept in a ref so chat:done can report it.
  const streamBufferRef = useRef<string>('');

  // ── Hydrate history for an existing conversation ──────────────────
  useEffect(() => {
    const {
      setConversationId,
      setMessages,
      setError,
      reset,
    } = useChatStore.getState();

    if (!initialConversationId) {
      // Fresh conversation — start from a clean slate.
      reset();
      return;
    }

    let cancelled = false;
    setConversationId(initialConversationId);
    setIsLoadingHistory(true);

    chatService
      .getMessages(initialConversationId)
      .then((history) => {
        if (cancelled) return;
        setMessages(history.map(({ tokenCount, ...m }) => m));
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not load conversation history.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialConversationId]);

  // ── Socket lifecycle + chat:* listeners ───────────────────────────
  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket() ?? connectSocket(accessToken);

    const {
      startAssistant,
      appendToken,
      finishAssistant,
      setError,
    } = useChatStore.getState();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const onChatStart = (payload: {
      conversationId: string;
      userMessageId: string;
      assistantMessageId: string;
    }) => {
      streamBufferRef.current = '';
      startAssistant({
        conversationId: payload.conversationId,
        assistantMessageId: payload.assistantMessageId,
      });
    };

    const onChatToken = (payload: { token: string }) => {
      streamBufferRef.current += payload.token;
      appendToken(payload.token);
    };

    const onChatDone = () => {
      const completedText = streamBufferRef.current;
      finishAssistant();
      streamBufferRef.current = '';
      if (completedText) onMessageCompleteRef.current?.(completedText);
    };

    const onChatError = (payload: { code: string; message: string }) => {
      setError(payload.message);
      streamBufferRef.current = '';
    };

    const onTaskCreated = (payload: { task: Task; source: string }) => {
      setNewTask(payload.task);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat:start', onChatStart);
    socket.on('chat:token', onChatToken);
    socket.on('chat:done', onChatDone);
    socket.on('chat:error', onChatError);
    socket.on('task:created', onTaskCreated);

    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat:start', onChatStart);
      socket.off('chat:token', onChatToken);
      socket.off('chat:done', onChatDone);
      socket.off('chat:error', onChatError);
      socket.off('task:created', onTaskCreated);
    };
  }, [accessToken]);

  // ── Send ───────────────────────────────────────────────────────────
  const sendMessage = useCallback((content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const { appendUserMessage, setError, isAssistantTyping, conversationId: convId } =
      useChatStore.getState();

    if (isAssistantTyping) return;

    const socket = getSocket();
    if (!socket?.connected) {
      setError('Not connected. Please wait and try again.');
      return;
    }

    appendUserMessage(trimmed);
    socket.emit('chat:message', {
      content: trimmed,
      conversationId: convId ?? undefined,
    });
  }, []);

  const clearError = useCallback(() => useChatStore.getState().setError(null), []);
  const clearNewTask = useCallback(() => setNewTask(null), []);

  return {
    messages,
    isConnected,
    isStreaming,
    isLoadingHistory,
    error,
    conversationId,
    newTask,
    sendMessage,
    clearError,
    clearNewTask,
  };
}
