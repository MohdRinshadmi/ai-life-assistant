import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { Task, TaskCreatedPayload } from '@ai-life/shared';
import { connectSocket, disconnectSocket, getSocket } from '@/services/socket/socketService';
import { useChatStore } from './chatStore';
import { upsertTaskInCache } from '@/features/tasks/useTasks';

interface ChatStartPayload {
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
}

function subscribeToConnection(onChange: () => void) {
  const socket = getSocket();
  socket.on('connect', onChange);
  socket.on('disconnect', onChange);
  return () => {
    socket.off('connect', onChange);
    socket.off('disconnect', onChange);
  };
}

/** Wires the chat store to the Socket.io streaming events (same protocol as mobile). */
export function useChat() {
  // Connection status is external state on the socket — read it via
  // useSyncExternalStore instead of mirroring it into useState.
  const connected = useSyncExternalStore(subscribeToConnection, () => getSocket().connected);
  const [taskToast, setTaskToast] = useState<Task | null>(null);

  useEffect(() => {
    const socket = connectSocket();
    const store = useChatStore.getState;

    const onStart = (p: ChatStartPayload) => {
      store().setConversationId(p.conversationId);
      store().startAssistant(p.assistantMessageId);
    };
    const onToken = (p: { token: string }) => store().appendToken(p.token);
    const onDone = () => store().finishAssistant();
    const onError = (p: { code: string; message: string }) => store().setError(p.message);
    const onTaskCreated = (p: TaskCreatedPayload) => {
      upsertTaskInCache(p.task);
      setTaskToast(p.task);
    };

    socket.on('chat:start', onStart);
    socket.on('chat:token', onToken);
    socket.on('chat:done', onDone);
    socket.on('chat:error', onError);
    socket.on('task:created', onTaskCreated);

    return () => {
      socket.off('chat:start', onStart);
      socket.off('chat:token', onToken);
      socket.off('chat:done', onDone);
      socket.off('chat:error', onError);
      socket.off('task:created', onTaskCreated);
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    if (!taskToast) return;
    const t = setTimeout(() => setTaskToast(null), 4000);
    return () => clearTimeout(t);
  }, [taskToast]);

  const sendMessage = useCallback((content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const { conversationId, appendUserMessage } = useChatStore.getState();
    appendUserMessage(trimmed);
    connectSocket().emit('chat:message', {
      content: trimmed,
      ...(conversationId ? { conversationId } : {}),
    });
  }, []);

  return { connected, taskToast, sendMessage };
}
