import { logger } from '@config';
import { isGeminiConfigured, streamChat, ChatTurn } from '@shared/services/gemini.service';

const BASE_SYSTEM_PROMPT = `You are an AI Life Assistant — a thoughtful, concise personal assistant that helps users manage tasks, track goals, reflect on their day, and stay organised. You give practical, direct answers. When you don't know something, say so. Never make up facts.`;

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string, inputTokens: number, outputTokens: number) => void;
  onError: (error: Error) => void;
}

/**
 * Stream a chat completion from Gemini.
 *
 * This module owns the *conversation* concerns (system prompt, RAG grounding,
 * context budgeting); the raw API mechanics live in gemini.service. That split
 * means swapping providers again later touches one file, not the chat module.
 *
 * ragContext — pre-retrieved knowledge snippets injected into the system
 * prompt as grounding facts. When present, the model is instructed to prefer
 * this information over its training knowledge for user-specific questions.
 *
 * Why inject into the system prompt rather than as a "user" message?
 * - Keeps the conversation turn structure clean (no fake user messages)
 * - Gemini caches large repeated prefixes implicitly — cheaper at scale
 * - Clearer separation of instructions from dialogue
 */
export async function streamChatCompletion(
  messages: LLMMessage[],
  callbacks: StreamCallbacks,
  ragContext?: string
): Promise<void> {
  if (!isGeminiConfigured()) {
    callbacks.onError(new Error('Gemini API key not configured'));
    return;
  }

  const systemPrompt = ragContext
    ? `${BASE_SYSTEM_PROMPT}\n\n## Relevant information from the user's personal notes:\n${ragContext}\n\nWhen answering, prioritise information from the notes above when it is relevant. Cite which note you're drawing from if helpful.`
    : BASE_SYSTEM_PROMPT;

  try {
    const result = await streamChat(messages as ChatTurn[], {
      system: systemPrompt,
      maxOutputTokens: 1024,
      onToken: callbacks.onToken,
    });

    callbacks.onDone(result.text, result.inputTokens, result.outputTokens);
  } catch (error) {
    logger.error({ msg: 'LLM stream error', error });
    callbacks.onError(error instanceof Error ? error : new Error('LLM call failed'));
  }
}

/**
 * Rough token estimator (4 chars ≈ 1 token).
 * Used for context window budgeting before the actual call.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Trim conversation history to stay within the context budget.
 * Always keeps at least the last 2 messages (last exchange).
 */
export function buildContextMessages(
  history: LLMMessage[],
  maxTokens = 4_000
): LLMMessage[] {
  const reversed = [...history].reverse();
  let budget = maxTokens;
  const selected: LLMMessage[] = [];

  for (const msg of reversed) {
    const cost = estimateTokens(msg.content);
    if (budget - cost < 0 && selected.length >= 2) break;
    selected.unshift(msg);
    budget -= cost;
  }

  return selected;
}
