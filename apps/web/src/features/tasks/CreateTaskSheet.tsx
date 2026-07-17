import { useState, type FormEvent } from 'react';
import type { TaskPriority } from '@ai-life/shared';
import { Button, Chip, Input, Sheet, TextArea } from '@/components/ui';
import { useCreateTask } from './useTasks';
import { PRIORITY_COLORS } from './taskMeta';

const DUE_PRESETS = [
  { label: 'None', days: null },
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'Next week', days: 7 },
] as const;

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

interface CreateTaskSheetProps {
  open: boolean;
  onClose: () => void;
}

export function CreateTaskSheet({ open, onClose }: CreateTaskSheetProps) {
  const createTask = useCreateTask();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDays, setDueDays] = useState<number | null>(null);

  const reset = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDays(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || createTask.isPending) return;
    let dueDate: string | undefined;
    if (dueDays !== null) {
      const d = new Date();
      d.setDate(d.getDate() + dueDays);
      d.setHours(18, 0, 0, 0);
      dueDate = d.toISOString();
    }
    createTask.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate,
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      },
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="New Task">
      <form onSubmit={handleSubmit}>
        <Input
          label="Title"
          placeholder="What needs to be done?"
          value={title}
          maxLength={255}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="field">
          <TextArea
            label="Description"
            placeholder="Optional details…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="field">
          <span className="field-label">Priority</span>
          <div className="pill-row" role="radiogroup" aria-label="Priority">
            {PRIORITIES.map((p) => (
              <Chip
                key={p}
                label={p[0].toUpperCase() + p.slice(1)}
                active={priority === p}
                activeColor={PRIORITY_COLORS[p]}
                onClick={() => setPriority(p)}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Due date</span>
          <div className="pill-row" role="radiogroup" aria-label="Due date">
            {DUE_PRESETS.map((preset) => (
              <Chip
                key={preset.label}
                label={preset.label}
                active={dueDays === preset.days}
                onClick={() => setDueDays(preset.days)}
              />
            ))}
          </div>
        </div>

        {createTask.isError && (
          <p className="field-error" role="alert">
            Couldn't create the task. Check your connection and try again.
          </p>
        )}

        <div className="sheet__actions">
          <Button variant="outline" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="lg"
            loading={createTask.isPending}
            disabled={!title.trim()}
          >
            Create Task
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
