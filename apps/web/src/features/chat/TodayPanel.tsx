import { Link } from 'react-router-dom';
import type { Task } from '@ai-life/shared';
import { Icon } from '@/components/ui';
import { useTasksQuery } from '@/features/tasks/useTasks';
import { useNotesQuery } from '@/features/knowledge/useNotes';
import { PRIORITY_COLORS } from '@/features/tasks/taskMeta';
import './TodayPanel.css';

interface Props {
  /** Feeds a prompt into the chat composer — the rail's CTAs talk to the assistant. */
  onSuggest: (prompt: string) => void;
}

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function isSameDay(iso: string | null | undefined, ref: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

function isOverdue(task: Task, now: Date): boolean {
  return (
    Boolean(task.dueDate) &&
    !isSameDay(task.dueDate, now) &&
    new Date(task.dueDate as string).getTime() < now.getTime()
  );
}

function dueLabel(task: Task, now: Date): string {
  if (!task.dueDate) return 'Anytime';
  if (isOverdue(task, now)) return 'Overdue';
  if (isSameDay(task.dueDate, now)) return 'Today';
  return new Date(task.dueDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function relativeTime(iso: string, now: Date): string {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
}

/**
 * TodayPanel — the "Today" rail beside the chat.
 *
 * Sports-dashboard grammar mapped to this app's real data: the Day Pulse
 * ring tracks today's task plate (due today, overdue, or completed today),
 * "Up next" lists the nearest open tasks, "Recent notes" the latest
 * captures. Everything links back to its full page; the empty-plate CTA
 * feeds the chat instead of dead-ending.
 */
export function TodayPanel({ onSuggest }: Props) {
  const now = new Date();
  const tasks = useTasksQuery('all').data ?? [];
  const notes = (useNotesQuery('').data ?? []).slice(0, 3);

  // Today's plate: anything demanding attention today.
  const plate = tasks.filter(
    (t) =>
      t.status !== 'cancelled' &&
      (isSameDay(t.dueDate, now) ||
        isOverdue(t, now) ||
        (t.status === 'completed' && isSameDay(t.updatedAt, now))),
  );
  const done = plate.filter((t) => t.status === 'completed').length;
  const pct = plate.length === 0 ? 0 : Math.round((done / plate.length) * 100);

  const upNext = tasks
    .filter((t) => t.status === 'pending' || t.status === 'in_progress')
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 3);

  return (
    <aside className="today" aria-label="Today at a glance">
      <header className="today__head rise">
        <h2>Today</h2>
        <span className="today__date">
          {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </header>

      {/* ── Day Pulse ── */}
      <section className="today__card rise rise-2" aria-label="Day pulse">
        <div className="pulse">
          <div className="pulse__ring">
            <svg viewBox="0 0 120 120" role="img" aria-label={`${pct}% of today's tasks done`}>
              <defs>
                <linearGradient id="pulse-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" style={{ stopColor: 'var(--primary)' }} />
                  <stop offset="100%" style={{ stopColor: 'var(--accent)' }} />
                </linearGradient>
              </defs>
              <circle className="pulse__track" cx="60" cy="60" r={RING_RADIUS} />
              <circle
                className="pulse__fill"
                cx="60"
                cy="60"
                r={RING_RADIUS}
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - pct / 100)}
              />
            </svg>
            <div className="pulse__value" aria-hidden="true">
              <strong>{pct}%</strong>
              <span>day pulse</span>
            </div>
          </div>
          {plate.length > 0 ? (
            <p className="pulse__caption">
              <strong>{done}</strong> of <strong>{plate.length}</strong> on today's plate
            </p>
          ) : (
            <div className="pulse__empty">
              <p>Nothing on today's plate.</p>
              <button type="button" className="chip" onClick={() => onSuggest('Plan my day')}>
                Plan my day
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Up next ── */}
      <section className="today__card rise rise-3" aria-label="Up next">
        <header className="today__card-head">
          <h3>Up next</h3>
          <Link to="/tasks" className="today__more">
            Tasks <Icon name="arrow-right" size={13} />
          </Link>
        </header>
        {upNext.length === 0 ? (
          <p className="today__blank">No open tasks — enjoy the clear lane.</p>
        ) : (
          <ul className="today__rows">
            {upNext.map((t) => (
              <li key={t.id} className="today__row">
                <span
                  className="today__dot"
                  style={{ background: PRIORITY_COLORS[t.priority] }}
                  aria-hidden="true"
                />
                <span className="today__row-title">{t.title}</span>
                <span
                  className={`today__due${dueLabel(t, now) === 'Overdue' ? ' today__due--late' : ''}`}
                >
                  {dueLabel(t, now)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Recent notes ── */}
      <section className="today__card rise rise-4" aria-label="Recent notes">
        <header className="today__card-head">
          <h3>Recent notes</h3>
          <Link to="/notes" className="today__more">
            Notes <Icon name="arrow-right" size={13} />
          </Link>
        </header>
        {notes.length === 0 ? (
          <p className="today__blank">No notes yet — tell the assistant to remember something.</p>
        ) : (
          <ul className="today__rows">
            {notes.map((n) => (
              <li key={n.id} className="today__row">
                <span className="today__row-title">{n.title}</span>
                <span className="today__due">{relativeTime(n.updatedAt, now)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
