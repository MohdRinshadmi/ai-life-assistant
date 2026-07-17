import { useMutation, useQuery } from '@tanstack/react-query';
import type { CreateTaskRequest, Task, TaskStatus, UpdateTaskRequest } from '@ai-life/shared';
import { tasksService } from '@/services/api/tasksService';
import { queryClient } from '@/lib/queryClient';

export type TaskFilter = TaskStatus | 'all';

const taskKeys = {
  all: ['tasks'] as const,
  list: (filter: TaskFilter) => ['tasks', filter] as const,
};

/** Apply an updater to every cached task list (one cache entry per filter). */
function updateAllLists(updater: (tasks: Task[]) => Task[]) {
  queryClient.setQueriesData<Task[]>({ queryKey: taskKeys.all }, (tasks) =>
    tasks ? updater(tasks) : tasks,
  );
}

function invalidateTasks() {
  void queryClient.invalidateQueries({ queryKey: taskKeys.all });
}

/** Merge a task pushed by the server (task:created socket event). */
export function upsertTaskInCache(task: Task) {
  updateAllLists((tasks) =>
    tasks.some((t) => t.id === task.id)
      ? tasks.map((t) => (t.id === task.id ? task : t))
      : [task, ...tasks],
  );
  invalidateTasks();
}

export function useTasksQuery(filter: TaskFilter) {
  return useQuery({
    queryKey: taskKeys.list(filter),
    queryFn: () => tasksService.list(filter),
  });
}

export function useCreateTask() {
  return useMutation({
    mutationFn: (payload: CreateTaskRequest) => tasksService.create(payload),
    onSuccess: (task) => upsertTaskInCache(task),
  });
}

interface UpdateArgs {
  id: string;
  payload: UpdateTaskRequest;
}

export function useUpdateTask() {
  return useMutation({
    mutationFn: ({ id, payload }: UpdateArgs) => tasksService.update(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const snapshot = queryClient.getQueriesData<Task[]>({ queryKey: taskKeys.all });
      updateAllLists((tasks) =>
        tasks.map((t) => (t.id === id ? ({ ...t, ...payload } as Task) : t)),
      );
      return { snapshot };
    },
    onError: (_err, _args, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: invalidateTasks,
  });
}

export function useDeleteTask() {
  return useMutation({
    mutationFn: (id: string) => tasksService.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const snapshot = queryClient.getQueriesData<Task[]>({ queryKey: taskKeys.all });
      updateAllLists((tasks) => tasks.filter((t) => t.id !== id));
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: invalidateTasks,
  });
}

/** completed ⇄ pending toggle used by the row checkbox. */
export function nextToggleStatus(task: Task): TaskStatus {
  return task.status === 'completed' ? 'pending' : 'completed';
}
