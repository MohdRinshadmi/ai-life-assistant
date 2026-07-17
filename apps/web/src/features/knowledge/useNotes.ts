import { useMutation, useQuery } from '@tanstack/react-query';
import type { KnowledgeItem } from '@ai-life/shared';
import { notesService } from '@/services/api/notesService';
import { queryClient } from '@/lib/queryClient';

const noteKeys = {
  all: ['notes'] as const,
  list: (query: string) => ['notes', query] as const,
};

function updateAllLists(updater: (items: KnowledgeItem[]) => KnowledgeItem[]) {
  queryClient.setQueriesData<KnowledgeItem[]>({ queryKey: noteKeys.all }, (items) =>
    items ? updater(items) : items,
  );
}

function invalidateNotes() {
  void queryClient.invalidateQueries({ queryKey: noteKeys.all });
}

/** `query` is the debounced search term; empty string lists everything. */
export function useNotesQuery(query: string) {
  const q = query.trim();
  return useQuery<KnowledgeItem[]>({
    queryKey: noteKeys.list(q),
    queryFn: () => (q ? notesService.search(q) : notesService.list()),
  });
}

export function useCreateNote() {
  return useMutation({
    mutationFn: (payload: { title: string; content: string }) => notesService.create(payload),
    onSuccess: (item) => {
      updateAllLists((items) => [item, ...items]);
      invalidateNotes();
    },
  });
}

interface UpdateArgs {
  id: string;
  payload: { title?: string; content?: string };
}

export function useUpdateNote() {
  return useMutation({
    mutationFn: ({ id, payload }: UpdateArgs) => notesService.update(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.all });
      const snapshot = queryClient.getQueriesData<KnowledgeItem[]>({ queryKey: noteKeys.all });
      updateAllLists((items) => items.map((n) => (n.id === id ? { ...n, ...payload } : n)));
      return { snapshot };
    },
    onError: (_err, _args, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: invalidateNotes,
  });
}

export function useDeleteNote() {
  return useMutation({
    mutationFn: (id: string) => notesService.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.all });
      const snapshot = queryClient.getQueriesData<KnowledgeItem[]>({ queryKey: noteKeys.all });
      updateAllLists((items) => items.filter((n) => n.id !== id));
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: invalidateNotes,
  });
}
