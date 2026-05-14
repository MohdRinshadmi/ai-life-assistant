import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, Task } from '@ai-life/shared';
import { connectSocket, getSocket } from '../../../services/socket/socketService';
import { useAuthStore } from '../../../stores/authStore';

export interface UIMessage extends Omit<Message, 'tokenCount'> {
  isStreaming?: boolean;
}

interface UseChatOptions {
  conversationId?: string;
  onMessageComplete?: (text: string) => void;
}

interface UseChatReturn {
  messages: UIMessage[];
  isConnected: boolean;
  isStreaming: boolean;
  error: string | null;
  conversationId: string | null;
  newTask: Task | null;
  sendMessage: (content: string) => void;
  clearError: () => void;
  clearNewTask: () => void;
}

export function useChat({
  conversationId: initialConversationId,
  onMessageComplete,
}: UseChatOptions = {}): UseChatReturn {
  const accessToken = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.id ?? '');

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId ?? null);
  const [newTask, setNewTask] = useState<Task | null>(null);

  const onMessageCompleteRef = useRef(onMessageComplete);

  // Track the assistant message ID being streamed so we can update it in place
  const streamingMessageIdRef = useRef<string | null>(null);
  const streamBufferRef = useRef<string>('');

  useEffect(() => {
    if (!accessToken) return;

    const socket = connectSocket(accessToken);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const onChatStart = (payload: { conversationId: string; userMessageId: string; assistantMessageId: string }) => {
      setConversationId(payload.conversationId);
      streamingMessageIdRef.current = payload.assistantMessageId;
      streamBufferRef.current = '';

      // Add a blank streaming assistant bubble
      setMessages((prev) => [
        ...prev,
        {
          id: payload.assistantMessageId,
          conversationId: payload.conversationId,
          role: 'assistant',
          content: '',
          createdAt: new Date().toISOString(),
          isStreaming: true,
        },
      ]);
    };

    const onChatToken = (payload: { token: string }) => {
      streamBufferRef.current += payload.token;
      const buffered = streamBufferRef.current;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingMessageIdRef.current
            ? { ...m, content: buffered }
            : m
        )
      );
    };

    const onChatDone = () => {
      const completedText = streamBufferRef.current;
      setIsStreaming(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingMessageIdRef.current ? { ...m, isStreaming: false } : m
        )
      );
      streamingMessageIdRef.current = null;
      streamBufferRef.current = '';
      if (completedText) onMessageCompleteRef.current?.(completedText);
    };

    const onTaskCreated = (payload: { task: Task; source: string }) => {
      setNewTask(payload.task);
    };

    const onChatError = (payload: { code: string; message: string }) => {
      setIsStreaming(false);
      setError(payload.message);
      // Remove empty assistant bubble if stream never started producing tokens
      setMessages((prev) =>
        prev.filter(
          (m) => !(m.id === streamingMessageIdRef.current && m.content === '')
        )
      );
      streamingMessageIdRef.current = null;
      streamBufferRef.current = '';
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

  const sendMessage = useCallback(
    (content: string) => {
      const socket = getSocket();
      if (!socket?.connected) {
        setError('Not connected. Please wait and try again.');
        return;
      }
      if (isStreaming) return;

      const userMessage: UIMessage = {
        id: `local-${Date.now()}`,
        conversationId: conversationId ?? '',
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setError(null);

      socket.emit('chat:message', {
        content,
        conversationId: conversationId ?? undefined,
      });
    },
    [conversationId, isStreaming]
  );

  const clearError = useCallback(() => setError(null), []);
  const clearNewTask = useCallback(() => setNewTask(null), []);

  return { messages, isConnected, isStreaming, error, conversationId, newTask, sendMessage, clearError, clearNewTask };
}
