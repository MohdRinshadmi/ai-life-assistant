export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  tokenCount: number | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Socket.io Event Payloads ──────────────────────────

export interface ChatMessagePayload {
  conversationId?: string;
  content: string;
}

export interface ChatStartPayload {
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
}

export interface ChatTokenPayload {
  token: string;
}

export interface ChatDonePayload {
  conversationId: string;
  assistantMessageId: string;
  totalTokens: number;
}

export interface ChatErrorPayload {
  code: string;
  message: string;
}

// Typed event maps — consumed by Socket.io on both server and client
export interface ServerToClientEvents {
  'chat:start': (payload: ChatStartPayload) => void;
  'chat:token': (payload: ChatTokenPayload) => void;
  'chat:done': (payload: ChatDonePayload) => void;
  'chat:error': (payload: ChatErrorPayload) => void;
  'task:created': (payload: import('./task').TaskCreatedPayload) => void;
}

export interface ClientToServerEvents {
  'chat:message': (payload: ChatMessagePayload) => void;
}
