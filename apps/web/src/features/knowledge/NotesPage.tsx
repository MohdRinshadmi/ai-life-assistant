import { useRef, useState } from 'react';
import { create } from 'zustand';
import type { KnowledgeItem } from '@ai-life/shared';
import { Badge, Icon, IconButton, StateView } from '@/components/ui';
import { useDeleteNote, useNotesQuery } from './useNotes';
import { NoteEditorSheet } from './NoteEditorSheet';
import './NotesPage.css';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** UI-only state: the search term survives navigation (Zustand). */
const useNoteSearch = create<{ query: string; setQuery: (q: string) => void }>((set) => ({
  query: '',
  setQuery: (query) => set({ query }),
}));

function NoteCard({ note, onOpen }: { note: KnowledgeItem; onOpen: () => void }) {
  const deleteNote = useDeleteNote();
  return (
    <article
      className="glass-card glass-card--interactive notes__card"
      role="button"
      tabIndex={0}
      aria-label={`Edit note: ${note.title}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
      }}
    >
      <div className="notes__card-top">
        <h3>{note.title}</h3>
        <IconButton
          label="Delete note"
          className="notes__card-delete"
          onClick={(e) => {
            e.stopPropagation();
            deleteNote.mutate(note.id);
          }}
        >
          <Icon name="close" size={15} />
        </IconButton>
      </div>
      <p className="notes__card-preview">{note.content}</p>
      <footer className="notes__card-footer">
        <Badge color="var(--primary-light)">In AI context</Badge>
        <span>{relativeTime(note.updatedAt)}</span>
      </footer>
    </article>
  );
}

export function NotesPage() {
  const { query, setQuery } = useNoteSearch();
  const { data: items, isPending, isError, refetch } = useNotesQuery(query);
  const [editing, setEditing] = useState<KnowledgeItem | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearch = (value: string) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setQuery(value), 300);
  };

  const openEditor = (note: KnowledgeItem | null) => {
    setEditing(note);
    setShowEditor(true);
  };

  return (
    <div className="notes">
      <header className="notes__header">
        <h1>Notes</h1>
      </header>

      <div className="notes__search">
        <Icon name="search" size={17} />
        <input
          type="search"
          placeholder="Search your notes"
          aria-label="Search your notes"
          defaultValue={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {isPending ? (
        <StateView variant="loading" description="Loading your notes…" />
      ) : isError ? (
        <StateView
          variant="error"
          title="Couldn't load notes"
          description="Check your connection and try again."
          actionLabel="Retry"
          onAction={() => void refetch()}
        />
      ) : items.length === 0 ? (
        query.trim() ? (
          <StateView
            variant="empty"
            title="No matches"
            description={`Nothing found for "${query.trim()}".`}
          />
        ) : (
          <StateView
            variant="empty"
            visual={
              <span className="state-view__icon">
                <Icon name="notes" size={26} />
              </span>
            }
            title="No notes yet"
            description="Capture an idea — it becomes part of your AI's context."
            actionLabel="New note"
            onAction={() => openEditor(null)}
          />
        )
      ) : (
        <div className="notes__grid">
          {items.map((note) => (
            <NoteCard key={note.id} note={note} onOpen={() => openEditor(note)} />
          ))}
        </div>
      )}

      <button className="notes__fab" aria-label="New note" onClick={() => openEditor(null)}>
        <Icon name="plus" size={26} />
      </button>

      {showEditor && (
        <NoteEditorSheet
          open={showEditor}
          note={editing}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}
