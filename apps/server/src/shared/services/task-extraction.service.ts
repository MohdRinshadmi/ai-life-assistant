import Anthropic from '@anthropic-ai/sdk';
import { config, logger } from '@config';
import { TaskPriority } from '@ai-life/shared';

const anthropic = new Anthropic({ apiKey: config.ai.anthropic.apiKey });

interface ExtractedTask {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string; // ISO 8601
}

/**
 * Task Extraction Service
 *
 * Uses Claude Haiku (fast + cheap) to analyze a single conversation turn
 * and determine if the user implicitly requested a task to be created.
 *
 * Why post-stream instead of tool use during streaming?
 * - Keeps the streaming pipeline simple (no buffering mid-stream)
 * - Runs as a background fire-and-forget after chat:done is emitted
 * - Haiku processes this in ~200ms — imperceptible to the user
 * - The task:created socket event arrives within ~500ms of chat:done
 *
 * Why Haiku instead of Sonnet for extraction?
 * - This is a classification + extraction task, not generation
 * - Haiku is 10× cheaper than Sonnet and ~3× faster
 * - Quality is sufficient for structured JSON extraction
 */
export async function extractTaskFromConversation(
  userMessage: string,
  assistantResponse: string
): Promise<ExtractedTask | null> {
  if (!config.ai.anthropic.apiKey) return null;

  const today = new Date().toISOString().split('T')[0];

  const prompt = `You are a task extraction system. Analyze this conversation turn and determine if the user requested creating a task, reminder, or to-do item.

Today's date: ${today}

User said: "${userMessage}"
Assistant responded: "${assistantResponse}"

If a task was explicitly or implicitly requested (e.g., "remind me to...", "I need to...", "don't let me forget...", "add to my list..."), return a JSON object:
{
  "title": "short action-oriented title (max 100 chars)",
  "description": "optional detail (or omit)",
  "priority": "low" | "medium" | "high",
  "dueDate": "ISO 8601 datetime or omit if no date mentioned"
}

If NO task was requested, return: null

Return ONLY the JSON object or null. No explanation.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim();

    if (raw === 'null' || raw === '') return null;

    const parsed = JSON.parse(raw) as ExtractedTask;

    // Validate required fields
    if (!parsed.title || typeof parsed.title !== 'string') return null;

    return {
      title: parsed.title.slice(0, 100),
      description: parsed.description,
      priority: (['low', 'medium', 'high'] as TaskPriority[]).includes(parsed.priority)
        ? parsed.priority
        : 'medium',
      dueDate: parsed.dueDate,
    };
  } catch (error) {
    // Extraction is best-effort — never fail the chat because of this
    logger.warn({ msg: 'Task extraction failed', error });
    return null;
  }
}
