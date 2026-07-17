import { useState } from 'react';
import type { KnowledgeItem } from '@ai-life/shared';
import { Button, Sheet } from '@/components/ui';
import { useCreateNote, useUpdateNote } from './useNotes';

interface NoteEditorSheetProps {
  open: boolean;
  /** null = create a new note */
  note: KnowledgeItem | null;
  onClose: () => void;
}

export function NoteEditorSheet({ open, note, onClose }: NoteEditorSheetProps) {
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');

  const valid = title.trim().length > 0 && content.trim().length > 0;
  const saving = createNote.isPending || updateNote.isPending;
  const failed = createNote.isError || updateNote.isError;

  const handleSave = () => {
    if (!valid || saving) return;
    const payload = { title: title.trim(), content: content.trim() };
    const done = { onSuccess: onClose };
    if (note) updateNote.mutate({ id: note.id, payload }, done);
    else createNote.mutate(payload, done);
  };

  return (
    <Sheet open={open} onClose={onClose} title={note ? 'Edit Note' : 'New Note'}>
      <div className="notes__editor">
        <input
          className="notes__editor-title"
          placeholder="Title"
          value={title}
          autoFocus={!note}
          aria-label="Note title"
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="notes__editor-content"
          placeholder="Start writing…"
          value={content}
          aria-label="Note content"
          onChange={(e) => setContent(e.target.value)}
        />
        {failed && (
          <p className="field-error" role="alert">
            Couldn't save the note. Check your connection and try again.
          </p>
        )}
        <div className="sheet__actions">
          <Button variant="outline" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" loading={saving} disabled={!valid} onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
