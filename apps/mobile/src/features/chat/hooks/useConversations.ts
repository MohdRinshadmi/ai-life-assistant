import { useState, useEffect, useCallback } from 'react';
import { Conversation } from '@ai-life/shared';
import { logger } from '@utils/logger';
import { chatService } from '../services/chatService';

interface UseConversationsReturn {
  conversations: Conversation[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/**
 * useConversations — the sidebar's data source.
 *
 * Owns the most-recent-first conversation list. `refresh()` is cheap and
 * idempotent, so callers re-invoke it whenever the list may have drifted
 * (a new conversation was created, a reply finished and the server
 * auto-titled it). Deletion is optimistic: the row disappears immediately
 * and the list re-syncs from the server if the request fails.
 */
export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setConversations(await chatService.listConversations());
    } catch (e) {
      logger.error('Failed to load conversations', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const remove = useCallback(
    async (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      try {
        await chatService.deleteConversation(id);
      } catch (e) {
        logger.error('Failed to delete conversation', e);
        await refresh();
      }
    },
    [refresh]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { conversations, isLoading, refresh, remove };
}
