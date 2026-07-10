import { useEffect, useRef, useState } from 'react';
import type { KnowledgeItem } from '@ai-life/shared';
import { Icon } from '@/components/ui/Icon';
import { useNotesStore } from './notesStore';
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

function NoteEditor({
  note,
  onClose,
}: {
  note: KnowledgeItem | null;
  onClose: () => void;
}) {
  const { create, update } = useNotesStore();
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [saving, setSaving] = useState(false);
  const valid = title.trim().length > 0 && content.trim().length > 0;

  const handleSave = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      if (note) await update(note.id, { title: title.trim(), content: content.trim() });
      else await create({ title: title.trim(), content: content.trim() });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet notes__editor" onClick={(e) => e.stopPropagation()}>
        <header className="notes__editor-header">
          <button className="notes__editor-cancel" onClick={onClose}>
            Cancel
          </button>
          <h3>{note ? 'Edit Note' : 'New Note'}</h3>
          <button
            className={`notes__editor-save${valid ? '' : ' notes__editor-save--dim'}`}
            onClick={() => void handleSave()}
            disabled={!valid || saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </header>
        <input
          className="notes__editor-title"
          placeholder="Title"
          value={title}
          autoFocus={!note}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="notes__editor-content"
          placeholder="Start writing…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>
    </div>
  );
}

export function NotesPage() {
  const { items, loading, error, query, load, setQuery, remove } = useNotesStore();
  const [editing, setEditing] = useState<KnowledgeItem | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (value: string) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void setQuery(value), 300);
  };

  return (
    <div className="notes">
      <header className="notes__header">
        <h1>Notes</h1>
      </header>

      <div className="notes__search">
        <Icon name="search" size={17} />
        <input
          placeholder="Search your notes"
          defaultValue={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="empty-state">
          <span className="spinner" style={{ margin: '0 auto' }} />
          <p style={{ marginTop: 12 }}>Loading your notes…</p>
        </div>
      ) : error ? (
        <div className="empty-state">
          <h3>Couldn't load notes</h3>
          <p>{error}</p>
          <button className="pill-btn" style={{ marginTop: 16 }} onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <h3>No notes yet</h3>
          <p>Capture an idea — it becomes part of your AI's context.</p>
        </div>
      ) : (
        <div className="notes__grid">
          {items.map((note) => (
            <article
              key={note.id}
              className="glass-card notes__card"
              onClick={() => {
                setEditing(note);
                setShowEditor(true);
              }}
            >
              <div className="notes__card-top">
                <h3>{note.title}</h3>
                <button
                  className="notes__card-delete"
                  aria-label="Delete note"
                  onClick={(e) => {
                    e.stopPropagation();
                    void remove(note.id);
                  }}
                >
                  <Icon name="close" size={15} />
                </button>
              </div>
              <p className="notes__card-preview">{note.content}</p>
              <footer className="notes__card-footer">
                <span className="notes__card-badge">In AI context</span>
                <span>{relativeTime(note.updatedAt)}</span>
              </footer>
            </article>
          ))}
        </div>
      )}

      <button
        className="notes__fab"
        aria-label="New note"
        onClick={() => {
          setEditing(null);
          setShowEditor(true);
        }}
      >
        <Icon name="plus" size={26} />
      </button>

      {showEditor && <NoteEditor note={editing} onClose={() => setShowEditor(false)} />}
    </div>
  );
}
