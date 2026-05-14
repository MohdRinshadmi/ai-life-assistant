import OpenAI from 'openai';
import { config, logger } from '../../config';

const openai = new OpenAI({ apiKey: config.ai.openai.apiKey });

/**
 * Embedding Service — converts text into 1536-dimensional vectors.
 *
 * Model: text-embedding-3-small
 * - Dimensions: 1536
 * - Cost: ~$0.02 / 1M tokens (100× cheaper than ada-002)
 * - Quality: Competitive with ada-002 for semantic similarity tasks
 *
 * Why OpenAI for embeddings even though we use Anthropic for generation?
 * Anthropic doesn't offer an embeddings API. text-embedding-3-small is the
 * industry standard for RAG pipelines. The two models are orthogonal concerns.
 *
 * At 100k users with ~10 notes each and 1 note ~200 tokens:
 * 100k × 10 × 200 = 200M tokens → ~$4 total embedding cost. Negligible.
 */
export async function embedText(text: string): Promise<number[]> {
  if (!config.ai.openai.apiKey) {
    throw new Error('OPENAI_API_KEY is required for RAG embeddings');
  }

  // Truncate to 8191 tokens (model limit). Rough char estimate: 4 chars/token.
  const truncated = text.slice(0, 32_000);

  const response = await openai.embeddings.create({
    model: config.ai.openai.embeddingModel,
    input: truncated,
    encoding_format: 'float',
  });

  return response.data[0].embedding;
}

/**
 * Embed multiple texts in a single API call (batch).
 * Reduces latency and API round-trips when indexing many items at once.
 * OpenAI allows up to 2048 items per batch.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!config.ai.openai.apiKey) {
    throw new Error('OPENAI_API_KEY is required for RAG embeddings');
  }
  if (texts.length === 0) return [];

  const truncated = texts.map((t) => t.slice(0, 32_000));

  const response = await openai.embeddings.create({
    model: config.ai.openai.embeddingModel,
    input: truncated,
    encoding_format: 'float',
  });

  // Response preserves input order
  return response.data.map((d) => d.embedding);
}

/**
 * Safe embed — returns null instead of throwing when the API key is absent.
 * Used at query time so the app degrades gracefully (chat still works, just no RAG).
 */
export async function safeEmbedText(text: string): Promise<number[] | null> {
  try {
    return await embedText(text);
  } catch (error) {
    logger.warn({ msg: 'Embedding skipped (no API key or error)', error });
    return null;
  }
}
