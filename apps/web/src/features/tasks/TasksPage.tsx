import { useState } from 'react';
import { create } from 'zustand';
import type { Task } from '@ai-life/shared';
import { Badge, Button, Card, Icon, IconButton, StateView } from '@/components/ui';
import {
  nextToggleStatus,
  useDeleteTask,
  useTasksQuery,
  useUpdateTask,
  type TaskFilter,
} from './useTasks';
import { PRIORITY_COLORS, STATUS_COLORS, STATUS_LABELS } from './taskMeta';
import { CreateTaskSheet } from './CreateTaskSheet';
import './TasksPage.css';

const FILTERS: Array<{ key: TaskFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

/** UI-only state: the selected filter survives navigation (Zustand). */
const useTaskFilter = create<{ filter: TaskFilter; setFilter: (f: TaskFilter) => void }>(
  (set) => ({ filter: 'all', setFilter: (filter) => set({ filter }) }),
);

function formatDue(dueDate: string): string {
  return `Due ${new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function TaskRow({ task }: { task: Task }) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const done = task.status === 'completed';

  return (
    <Card className="tasks__row">
      <button
        type="button"
        className={`tasks__check${done ? ' tasks__check--done' : ''}`}
        onClick={() => updateTask.mutate({ id: task.id, payload: { status: nextToggleStatus(task) } })}
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark "${task.title}" as pending` : `Mark "${task.title}" as completed`}
      >
        {done && <Icon name="check" size={13} />}
      </button>
      <div className="tasks__body">
        <p className={`tasks__title${done ? ' tasks__title--done' : ''}`}>{task.title}</p>
        {task.description && <p className="tasks__descr">{task.description}</p>}
        <div className="tasks__meta">
          <Badge color={PRIORITY_COLORS[task.priority]} dot>
            {task.priority}
          </Badge>
          <Badge color={STATUS_COLORS[task.status]}>{STATUS_LABELS[task.status]}</Badge>
          {task.dueDate && <span className="tasks__due">{formatDue(task.dueDate)}</span>}
        </div>
      </div>
      <IconButton
        label="Delete task"
        className="tasks__delete"
        onClick={() => deleteTask.mutate(task.id)}
      >
        <Icon name="trash" size={16} />
      </IconButton>
    </Card>
  );
}

export function TasksPage() {
  const { filter, setFilter } = useTaskFilter();
  const { data: tasks, isPending, isError, refetch } = useTasksQuery(filter);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="tasks">
      <header className="tasks__header">
        <div>
          <h1>Tasks</h1>
          <p>Plan your day, stay on track</p>
        </div>
        <Button size="sm" iconLeft={<Icon name="plus" size={15} />} onClick={() => setShowCreate(true)}>
          New
        </Button>
      </header>

      <div className="tasks__filters" role="tablist" aria-label="Filter tasks">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            className={`chip${filter === f.key ? ' chip--active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isPending ? (
        <StateView variant="loading" />
      ) : isError ? (
        <StateView
          variant="error"
          title="Something went wrong"
          description="Your tasks couldn't be loaded."
          actionLabel="Try again"
          onAction={() => void refetch()}
        />
      ) : tasks.length === 0 ? (
        <StateView
          variant="empty"
          visual={
            <span className="state-view__icon">
              <Icon name="tasks" size={26} />
            </span>
          }
          title="No tasks"
          description="Create one, or just ask the AI in chat."
          actionLabel="New task"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="tasks__list">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}

      <CreateTaskSheet open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
