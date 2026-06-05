import { create } from 'zustand';
import {
  KnowledgeItem,
  CreateKnowledgeItemRequest,
  UpdateKnowledgeItemRequest,
} from '@ai-life/shared';
import { knowledgeService } from '../services/knowledgeService';

/**
 * Notes Store — Zustand
 *
 * Holds the user's knowledge items (notes). `query` drives the search
 * endpoint; when empty we fall back to the full list. Mutations are
 * applied optimistically and rolled back if the request fails so the
 * UI stays responsive without waiting on the network.
 */

interface NotesState {
  items: KnowledgeItem[];
  loading: boolean;
  error: string | null;
  query: string;

  load: () => Promise<void>;
  setQuery: (query: string) => void;
  create: (payload: CreateKnowledgeItemRequest) => Promise<KnowledgeItem | null>;
  update: (id: string, payload: UpdateKnowledgeItemRequest) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

function toMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}

export const useNotesStore = create<NotesState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  query: '',

  load: async () => {
    set({ loading: true, error: null });
    const { query } = get();
    try {
      const items = query.trim()
        ? await knowledgeService.search(query.trim())
        : await knowledgeService.list();
      set({ items, loading: false });
    } catch (err) {
      set({ loading: false, error: toMessage(err) });
    }
  },

  setQuery: (query) => {
    set({ query });
    // Re-run the search/list for the new query.
    void get().load();
  },

  create: async (payload) => {
    try {
      const item = await knowledgeService.create(payload);
      set((s) => ({ items: [item, ...s.items], error: null }));
      return item;
    } catch (err) {
      set({ error: toMessage(err) });
      return null;
    }
  },

  update: async (id, payload) => {
    const prev = get().items;
    // Optimistic: patch the row immediately.
    set((s) => ({
      items: s.items.map((n) =>
        n.id === id ? { ...n, ...payload, updatedAt: new Date().toISOString() } : n,
      ),
      error: null,
    }));
    try {
      const updated = await knowledgeService.update(id, payload);
      set((s) => ({ items: s.items.map((n) => (n.id === id ? updated : n)) }));
    } catch (err) {
      set({ items: prev, error: toMessage(err) });
    }
  },

  remove: async (id) => {
    const prev = get().items;
    // Optimistic: drop the row immediately.
    set((s) => ({ items: s.items.filter((n) => n.id !== id), error: null }));
    try {
      await knowledgeService.delete(id);
    } catch (err) {
      set({ items: prev, error: toMessage(err) });
    }
  },
}));
