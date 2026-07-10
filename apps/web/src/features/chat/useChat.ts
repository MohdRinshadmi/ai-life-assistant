import { useCallback, useEffect, useState } from 'react';
import type { Task, TaskCreatedPayload } from '@ai-life/shared';
import { connectSocket, disconnectSocket } from '@/services/socket/socketService';
import { useChatStore } from './chatStore';
import { useTasksStore } from '@/features/tasks/tasksStore';

interface ChatStartPayload {
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
}

/** Wires the chat store to the Socket.io streaming events (same protocol as mobile). */
export function useChat() {
  const [connected, setConnected] = useState(false);
  const [taskToast, setTaskToast] = useState<Task | null>(null);

  useEffect(() => {
    const socket = connectSocket();
    const store = useChatStore.getState;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onStart = (p: ChatStartPayload) => {
      store().setConversationId(p.conversationId);
      store().startAssistant(p.assistantMessageId);
    };
    const onToken = (p: { token: string }) => store().appendToken(p.token);
    const onDone = () => store().finishAssistant();
    const onError = (p: { code: string; message: string }) => store().setError(p.message);
    const onTaskCreated = (p: TaskCreatedPayload) => {
      useTasksStore.getState().upsert(p.task);
      setTaskToast(p.task);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat:start', onStart);
    socket.on('chat:token', onToken);
    socket.on('chat:done', onDone);
    socket.on('chat:error', onError);
    socket.on('task:created', onTaskCreated);
    setConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
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
