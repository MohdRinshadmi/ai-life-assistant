import { GoogleGenAI } from '@google/genai';
import { config, logger } from '@config';

/**
 * Gemini Service — the single owner of the Gemini API key.
 *
 * Every Gemini call in the codebase goes through this module so the key is
 * read from validated config exactly once, never from raw process.env.
 *
 * Why a lazy singleton instead of a module-level `new GoogleGenAI(...)`?
 * - GEMINI_API_KEY is optional in the env schema. Constructing the client at
 *   import time with an undefined key would make *importing* this file the
 *   failure point. Lazy init moves the failure to the first actual call,
 *   so the server still boots (and chat still works) without the key —
 *   only Gemini-backed features degrade.
 */
let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!config.ai.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY is required for Gemini API calls');
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: config.ai.gemini.apiKey });
  }
  return client;
}

export function isGeminiConfigured(): boolean {
  return Boolean(config.ai.gemini.apiKey);
}

// ── Embeddings ──────────────────────────────────────────────

const EMBEDDING_MODEL = 'gemini-embedding-001';

/**
 * MUST match vector(1536) in infrastructure/database/schema/knowledge.ts.
 * gemini-embedding-001 natively outputs 3072 dims; we ask for 1536 via
 * Matryoshka truncation so existing rows and the pgvector column keep working.
 */
const EMBEDDING_DIMENSIONS = 1536;

// gemini-embedding-001 input cap is 2048 tokens (~4 chars/token)
const MAX_INPUT_CHARS = 8_000;

// Max texts per embedContent request
const MAX_BATCH_SIZE = 100;

/**
 * Task type tells Gemini how the embedding will be used, which measurably
 * improves retrieval quality:
 * - RETRIEVAL_DOCUMENT: for content being indexed (notes, knowledge items)
 * - RETRIEVAL_QUERY: for the search query at lookup time
 */
export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

/**
 * Gemini only guarantees unit-length vectors at the full 3072 dims; truncated
 * outputs (like our 1536) are not normalized. Cosine distance itself is
 * scale-invariant, but normalizing keeps stored vectors consistent and makes
 * inner-product / L2 queries valid too.
 */
function l2Normalize(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return values;
  return values.map((v) => v / norm);
}

/**
 * Embed a single text into a 1536-dimensional vector.
 * Throws when the key is missing — use safeEmbedText where degradation is OK.
 */
export async function embedText(
  text: string,
  taskType: EmbeddingTaskType = 'RETRIEVAL_DOCUMENT'
): Promise<number[]> {
  const ai = getClient();

  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text.slice(0, MAX_INPUT_CHARS),
    config: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType,
    },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values) {
    throw new Error('Gemini returned no embedding');
  }

  return l2Normalize(values);
}

/**
 * Embed multiple texts, batching MAX_BATCH_SIZE per API call.
 * Reduces latency and round-trips when indexing many items at once.
 */
export async function embedBatch(
  texts: string[],
  taskType: EmbeddingTaskType = 'RETRIEVAL_DOCUMENT'
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const ai = getClient();

  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const chunk = texts.slice(i, i + MAX_BATCH_SIZE).map((t) => t.slice(0, MAX_INPUT_CHARS));

    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: chunk,
      config: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType,
      },
    });

    const embeddings = response.embeddings;
    if (!embeddings || embeddings.length !== chunk.length) {
      throw new Error('Gemini returned an incomplete embedding batch');
    }

    for (const embedding of embeddings) {
      if (!embedding.values) {
        throw new Error('Gemini returned an embedding without values');
      }
      results.push(l2Normalize(embedding.values));
    }
  }

  return results;
}

/**
 * Safe embed — returns null instead of throwing when the API key is absent
 * or the API call fails. Used at query time so the app degrades gracefully
 * (chat still works, just no RAG).
 */
export async function safeEmbedText(
  text: string,
  taskType: EmbeddingTaskType = 'RETRIEVAL_DOCUMENT'
): Promise<number[] | null> {
  try {
    return await embedText(text, taskType);
  } catch (error) {
    logger.warn({ msg: 'Embedding skipped (no API key or error)', error });
    return null;
  }
}

// ── Text Generation ─────────────────────────────────────────

export interface GenerateTextOptions {
  system?: string;
  maxOutputTokens?: number;
  temperature?: number;
  /** Override the configured model, e.g. 'gemini-2.5-flash-lite' for cheap classification jobs */
  model?: string;
  /**
   * Force valid-JSON output (Gemini's native JSON mode). Stronger than
   * prompt-begging for JSON — the decoder itself is constrained, so no
   * markdown fences or chatty preamble to strip.
   */
  json?: boolean;
}

/**
 * Single-shot (non-streaming) text generation.
 * Suited for background jobs like task extraction or summarization;
 * interactive chat goes through streamChat below.
 */
export async function generateText(
  prompt: string,
  options: GenerateTextOptions = {}
): Promise<string> {
  const ai = getClient();

  try {
    const response = await ai.models.generateContent({
      model: options.model ?? config.ai.gemini.model,
      contents: prompt,
      config: {
        systemInstruction: options.system,
        maxOutputTokens: options.maxOutputTokens ?? 1024,
        temperature: options.temperature,
        responseMimeType: options.json ? 'application/json' : undefined,
      },
    });

    return response.text ?? '';
  } catch (error) {
    logger.error({ msg: 'Gemini generation error', error });
    throw error instanceof Error ? error : new Error('Gemini call failed');
  }
}

// ── Streaming Chat ──────────────────────────────────────────

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamChatResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Stream a multi-turn chat completion, invoking onToken per text chunk.
 * Resolves with the full text + token usage once the stream completes.
 *
 * Gemini's wire format differs from Anthropic/OpenAI in two ways handled here:
 * - The assistant role is called 'model'
 * - Messages are { role, parts: [{ text }] }, not { role, content }
 * Callers keep the conventional user/assistant shape; mapping stays internal.
 */
export async function streamChat(
  messages: ChatTurn[],
  options: {
    system?: string;
    maxOutputTokens?: number;
    onToken: (token: string) => void;
  }
): Promise<StreamChatResult> {
  const ai = getClient();

  const stream = await ai.models.generateContentStream({
    model: config.ai.gemini.model,
    contents: messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    config: {
      systemInstruction: options.system,
      maxOutputTokens: options.maxOutputTokens ?? 1024,
    },
  });

  let fullText = '';
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const chunk of stream) {
    const token = chunk.text;
    if (token) {
      fullText += token;
      options.onToken(token);
    }
    // usageMetadata arrives on the final chunk; earlier chunks carry partial counts
    if (chunk.usageMetadata) {
      inputTokens = chunk.usageMetadata.promptTokenCount ?? inputTokens;
      outputTokens = chunk.usageMetadata.candidatesTokenCount ?? outputTokens;
    }
  }

  return { text: fullText, inputTokens, outputTokens };
}
