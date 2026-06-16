import { logger } from '@config';
import { TaskPriority } from '@ai-life/shared';
import { generateText, isGeminiConfigured } from '@shared/services/gemini.service';

interface ExtractedTask {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string; // ISO 8601
}

/**
 * Task Extraction Service
 *
 * Uses Gemini Flash-Lite (fast + cheap) to analyze a single conversation turn
 * and determine if the user implicitly requested a task to be created.
 *
 * Why post-stream instead of tool use during streaming?
 * - Keeps the streaming pipeline simple (no buffering mid-stream)
 * - Runs as a background fire-and-forget after chat:done is emitted
 * - Flash-Lite processes this in a few hundred ms — imperceptible to the user
 * - The task:created socket event arrives shortly after chat:done
 *
 * Why Flash-Lite instead of the main chat model?
 * - This is a classification + extraction task, not generation
 * - Flash-Lite is the cheapest/fastest Gemini tier — quality is sufficient
 *   for structured JSON extraction
 * - JSON mode (responseMimeType) constrains the decoder, so output is
 *   guaranteed parseable — no markdown fences to strip
 */
export async function extractTaskFromConversation(
  userMessage: string,
  assistantResponse: string
): Promise<ExtractedTask | null> {
  if (!isGeminiConfigured()) return null;

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
    const raw = (
      await generateText(prompt, {
        model: 'gemini-2.5-flash-lite',
        maxOutputTokens: 256,
        json: true,
      })
    ).trim();

    if (raw === '' || raw === 'null') return null;

    // JSON.parse('null') is also valid JSON — handled by the falsy check
    const parsed = JSON.parse(raw) as ExtractedTask | null;
    if (!parsed || !parsed.title || typeof parsed.title !== 'string') return null;

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
