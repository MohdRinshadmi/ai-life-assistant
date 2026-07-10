import { useEffect, useState, type FormEvent } from 'react';
import type { TaskPriority, TaskStatus } from '@ai-life/shared';
import { Icon } from '@/components/ui/Icon';
import { useTasksStore, type TaskFilter } from './tasksStore';
import './TasksPage.css';

const FILTERS: Array<{ key: TaskFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#EF4444',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: '#9A8AB8',
  in_progress: '#3B82F6',
  completed: '#22C55E',
  cancelled: '#EF4444',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const DUE_PRESETS = [
  { label: 'None', days: null },
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'Next week', days: 7 },
] as const;

function formatDue(dueDate: string): string {
  return `Due ${new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function CreateTaskSheet({ onClose }: { onClose: () => void }) {
  const create = useTasksStore((s) => s.create);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDays, setDueDays] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    let dueDate: string | undefined;
    if (dueDays !== null) {
      const d = new Date();
      d.setDate(d.getDate() + dueDays);
      d.setHours(18, 0, 0, 0);
      dueDate = d.toISOString();
    }
    try {
      await create({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="sheet__handle" />
        <h3 className="sheet__title">New Task</h3>

        <label className="field-label">Title</label>
        <input
          className="dark-input"
          placeholder="What needs to be done?"
          value={title}
          maxLength={255}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="field-label" style={{ marginTop: 16 }}>
          Description
        </label>
        <textarea
          className="dark-input tasks__desc-input"
          placeholder="Optional details…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <label className="field-label" style={{ marginTop: 16 }}>
          Priority
        </label>
        <div className="tasks__pills">
          {(['low', 'medium', 'high'] as const).map((p) => (
            <button
              key={p}
              type="button"
              className="chip"
              style={
                priority === p
                  ? { background: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p], color: '#fff' }
                  : undefined
              }
              onClick={() => setPriority(p)}
            >
              {p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        <label className="field-label" style={{ marginTop: 16 }}>
          Due date
        </label>
        <div className="tasks__pills">
          {DUE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={`chip${dueDays === preset.days ? ' chip--active' : ''}`}
              onClick={() => setDueDays(preset.days)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="sheet__actions">
          <button type="button" className="pill-btn pill-btn--outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="pill-btn" disabled={!title.trim() || submitting}>
            {submitting ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function TasksPage() {
  const { tasks, statusFilter, loading, error, load, toggleComplete, remove } = useTasksStore();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="tasks">
      <header className="tasks__header">
        <div>
          <h1>Tasks</h1>
          <p>Plan your day, stay on track</p>
        </div>
        <button className="tasks__new" onClick={() => setShowCreate(true)}>
          <Icon name="plus" size={15} /> New
        </button>
      </header>

      <div className="tasks__filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`chip${statusFilter === f.key ? ' chip--active' : ''}`}
            onClick={() => void load(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state">
          <span className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : error ? (
        <div className="empty-state">
          <h3>Something went wrong</h3>
          <p>{error}</p>
          <button className="pill-btn" style={{ marginTop: 16 }} onClick={() => void load()}>
            Try again
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <h3>No tasks</h3>
          <p>Create one, or just ask the AI in chat.</p>
        </div>
      ) : (
        <div className="tasks__list">
          {tasks.map((task) => {
            const done = task.status === 'completed';
            return (
              <div key={task.id} className="glass-card tasks__row">
                <button
                  className={`tasks__check${done ? ' tasks__check--done' : ''}`}
                  onClick={() => void toggleComplete(task.id)}
                  aria-label={done ? 'Mark as pending' : 'Mark as completed'}
                >
                  {done && <Icon name="check" size={13} />}
                </button>
                <div className="tasks__body">
                  <p className={`tasks__title${done ? ' tasks__title--done' : ''}`}>{task.title}</p>
                  {task.description && <p className="tasks__descr">{task.description}</p>}
                  <div className="tasks__meta">
                    <span
                      className="badge"
                      style={{
                        background: `${PRIORITY_COLORS[task.priority]}22`,
                        border: `1px solid ${PRIORITY_COLORS[task.priority]}66`,
                        color: PRIORITY_COLORS[task.priority],
                      }}
                    >
                      <span
                        className="tasks__pri-dot"
                        style={{ background: PRIORITY_COLORS[task.priority] }}
                      />
                      {task.priority}
                    </span>
                    <span
                      className="badge"
                      style={{
                        background: `${STATUS_COLORS[task.status]}22`,
                        border: `1px solid ${STATUS_COLORS[task.status]}55`,
                        color: STATUS_COLORS[task.status],
                      }}
                    >
                      {STATUS_LABELS[task.status]}
                    </span>
                    {task.dueDate && <span className="tasks__due">{formatDue(task.dueDate)}</span>}
                  </div>
                </div>
                <button
                  className="tasks__delete"
                  onClick={() => void remove(task.id)}
                  aria-label="Delete task"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <CreateTaskSheet onClose={() => setShowCreate(false)} />}
    </div>
  );
}
