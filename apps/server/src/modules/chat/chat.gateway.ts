import { Server as SocketIOServer, Socket } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents, ChatMessagePayload } from '@ai-life/shared';
import { logger } from '@config';
import { chatService } from './chat.service';
import { extractTaskFromConversation } from '@shared/services/task-extraction.service';
import { tasksService } from '@modules/tasks/tasks.service';
import { NotFoundError, ForbiddenError } from '@shared/errors';

type IO = SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
type ChatSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/**
 * Chat Gateway — registers Socket.io event handlers for chat.
 *
 * Called once after the Socket.io server is initialized.
 * Separating gateway logic from socket server setup keeps the
 * infrastructure layer free of business logic.
 *
 * Stream event flow:
 *  Client  →  chat:message  →  Gateway
 *  Gateway →  chat:start    →  Client  (IDs ready)
 *  Gateway →  chat:token    →  Client  (each streamed token)
 *  Gateway →  chat:done     →  Client  (stream complete)
 *  Gateway →  chat:error    →  Client  (on any failure)
 */
export function registerChatGateway(io: IO): void {
  io.on('connection', (socket: ChatSocket) => {
    socket.on('chat:message', (payload: ChatMessagePayload) => {
      void handleChatMessage(io, socket, payload);
    });
  });
}

async function handleChatMessage(
  io: IO,
  socket: ChatSocket,
  payload: ChatMessagePayload
): Promise<void> {
  const userId = socket.data.userId as string;
  const { content, conversationId } = payload;

  if (!content?.trim()) {
    socket.emit('chat:error', { code: 'EMPTY_MESSAGE', message: 'Message cannot be empty' });
    return;
  }

  if (content.length > 4_000) {
    socket.emit('chat:error', { code: 'MESSAGE_TOO_LONG', message: 'Message exceeds 4000 characters' });
    return;
  }

  logger.info({ msg: 'Chat message received', userId, conversationId });

  let finalConversationId = '';
  let finalAssistantId = '';

  try {
    await chatService.streamResponse(userId, content, conversationId, {
      onConversationReady: (convId, userMsgId, assistantMsgId) => {
        finalConversationId = convId;
        finalAssistantId = assistantMsgId;
        socket.emit('chat:start', {
          conversationId: convId,
          userMessageId: userMsgId,
          assistantMessageId: assistantMsgId,
        });
      },

      onToken: (token) => {
        socket.emit('chat:token', { token });
      },

      onDone: (fullText, _inputTokens, outputTokens) => {
        socket.emit('chat:done', {
          conversationId: finalConversationId,
          assistantMessageId: finalAssistantId,
          totalTokens: outputTokens,
        });
        logger.info({ msg: 'Chat stream complete', userId, outputTokens });

        // Fire-and-forget: extract task intent and emit back to the user's room
        void (async () => {
          try {
            const extracted = await extractTaskFromConversation(content, fullText);
            if (!extracted) return;
            const task = await tasksService.create(userId, extracted);
            io.to(userId).emit('task:created', { task, source: 'ai_extraction' });
            logger.info({ msg: 'Task auto-created from chat', userId, taskId: task.id });
          } catch (err) {
            logger.warn({ msg: 'Post-stream task extraction failed', userId, err });
          }
        })();
      },

      onError: (error) => {
        logger.error({ msg: 'Chat stream error', userId, err: error });
        socket.emit('chat:error', {
          code: 'STREAM_ERROR',
          message: 'Failed to get a response. Please try again.',
        });
      },
    });
  } catch (error) {
    // Domain errors (stale/foreign conversationId) are expected client conditions,
    // not server faults. Log at warn and return a specific, actionable code so the
    // client can clear its cached conversationId and start a fresh conversation.
    if (error instanceof NotFoundError) {
      logger.warn({ msg: 'Chat request for missing conversation', userId, conversationId });
      socket.emit('chat:error', {
        code: 'CONVERSATION_NOT_FOUND',
        message: 'That conversation no longer exists. Starting a new one.',
      });
      return;
    }

    if (error instanceof ForbiddenError) {
      logger.warn({ msg: 'Chat request for forbidden conversation', userId, conversationId });
      socket.emit('chat:error', {
        code: 'FORBIDDEN',
        message: 'You do not have access to that conversation.',
      });
      return;
    }

    logger.error({ msg: 'Unhandled chat gateway error', userId, conversationId, err: error });
    socket.emit('chat:error', {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
    });
  }
}
