import { eq, and, desc, asc } from 'drizzle-orm';
import { db } from '@infrastructure/database';
import { tasks } from '@infrastructure/database/schema';
import { TaskStatus, TaskPriority } from '@ai-life/shared';

export const tasksRepository = {
  async create(data: {
    userId: string;
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: Date | null;
  }) {
    const [row] = await db
      .insert(tasks)
      .values({
        userId: data.userId,
        title: data.title,
        description: data.description ?? null,
        priority: data.priority ?? 'medium',
        dueDate: data.dueDate ?? null,
      })
      .returning();
    return row;
  },

  async findById(id: string, userId: string) {
    const [row] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .limit(1);
    return row ?? null;
  },

  async list(userId: string, filters: { status?: TaskStatus }, limit: number, offset: number) {
    const conditions = [eq(tasks.userId, userId)];
    if (filters.status) conditions.push(eq(tasks.status, filters.status));

    return db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(asc(tasks.dueDate), desc(tasks.createdAt))
      .limit(limit)
      .offset(offset);
  },

  async update(id: string, userId: string, data: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: Date | null;
  }) {
    const [row] = await db
      .update(tasks)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return row ?? null;
  },

  async delete(id: string, userId: string) {
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  },
};
