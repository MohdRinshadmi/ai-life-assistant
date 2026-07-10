import { create } from 'zustand';
import type { KnowledgeItem } from '@ai-life/shared';
import { notesService } from '@/services/api/notesService';
import { getApiErrorMessage } from '@/services/api/client';

interface NotesState {
  items: KnowledgeItem[];
  loading: boolean;
  error: string | null;
  query: string;
  load: () => Promise<void>;
  setQuery: (query: string) => Promise<void>;
  create: (payload: { title: string; content: string }) => Promise<void>;
  update: (id: string, payload: { title?: string; content?: string }) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  query: '',

  load: async () => {
    set({ loading: true, error: null });
    try {
      const q = get().query.trim();
      const items = q ? await notesService.search(q) : await notesService.list();
      set({ items, loading: false });
    } catch (err) {
      set({ error: getApiErrorMessage(err), loading: false });
    }
  },

  setQuery: async (query) => {
    set({ query });
    await get().load();
  },

  create: async (payload) => {
    const item = await notesService.create(payload);
    set((s) => ({ items: [item, ...s.items] }));
  },

  update: async (id, payload) => {
    const prev = get().items;
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, ...payload } : n)),
    }));
    try {
      const item = await notesService.update(id, payload);
      set((s) => ({ items: s.items.map((n) => (n.id === id ? item : n)) }));
    } catch (err) {
      set({ items: prev, error: getApiErrorMessage(err) });
    }
  },

  remove: async (id) => {
    const prev = get().items;
    set((s) => ({ items: s.items.filter((n) => n.id !== id) }));
    try {
      await notesService.remove(id);
    } catch (err) {
      set({ items: prev, error: getApiErrorMessage(err) });
    }
  },
}));
