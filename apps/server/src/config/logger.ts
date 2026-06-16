import path from 'path';
import pino, { type DestinationStream } from 'pino';
import pretty from 'pino-pretty';
import { config } from './env';

/**
 * Structured logger using Pino with per-level file separation.
 *
 * Why Pino over Winston?
 * - 5x faster (critical at 100k+ users)
 * - JSON-native (perfect for CloudWatch/DataDog/ELK)
 * - Low overhead (doesn't block event loop)
 * - pino-pretty for dev readability
 *
 * Output strategy (via pino.multistream — runs in-process, plays well with tsx):
 * - Console           → pretty+colorized in dev, raw JSON in prod. Respects LOG_LEVEL.
 * - logs/combined.log → every level ≥ debug (chronological, full forensic trail)
 * - logs/debug.log    → ONLY debug
 * - logs/info.log     → ONLY info
 * - logs/warn.log     → ONLY warn
 * - logs/error.log    → error AND fatal (you never want to miss a fatal)
 *
 * The base logger level is `debug` so the files always capture debug, while the
 * console stream filters to LOG_LEVEL — you get a clean console but full logs on
 * disk. Bump console verbosity by setting LOG_LEVEL (e.g. LOG_LEVEL=debug).
 */

// apps/server/logs (resolved from this file, works from both src/ and dist/)
const LOG_DIR = path.resolve(__dirname, '../../logs');

// Pino numeric levels: trace=10, debug=20, info=30, warn=40, error=50, fatal=60
const LEVEL_RE = /"level":(\d+)/;

/**
 * A file destination that only writes lines matching a level predicate.
 *
 * pino.multistream's per-stream `level` is "this level AND above", so it can't
 * isolate a single level by itself. We let every line reach the wrapper (entry
 * level: 'debug') and filter to the exact level(s) we want right here.
 */
function levelFilteredFile(
  fileName: string,
  matches: (levelValue: number) => boolean
): DestinationStream {
  const dest = pino.destination({
    dest: path.join(LOG_DIR, fileName),
    mkdir: true, // auto-create logs/ on first write
    sync: false, // buffered, non-blocking
  });

  return {
    write(line: string) {
      const m = LEVEL_RE.exec(line);
      if (m && matches(Number(m[1]))) {
        dest.write(line);
      }
    },
  };
}

// Console: pretty in dev, structured JSON (stdout) in prod.
const consoleStream: DestinationStream = config.server.isDev
  ? pretty({
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    })
  : process.stdout;

// Console respects LOG_LEVEL; file streams always capture from debug up.
const streams: pino.StreamEntry[] = [
  { level: config.logging.level, stream: consoleStream },
];

// File logging is noise in unit tests — skip it there.
if (!config.server.isTest) {
  streams.push(
    { level: 'debug', stream: levelFilteredFile('combined.log', () => true) },
    { level: 'debug', stream: levelFilteredFile('debug.log', (l) => l === 20) },
    { level: 'debug', stream: levelFilteredFile('info.log', (l) => l === 30) },
    { level: 'debug', stream: levelFilteredFile('warn.log', (l) => l === 40) },
    { level: 'debug', stream: levelFilteredFile('error.log', (l) => l >= 50) }
  );
}

export const logger = pino(
  {
    // Base level must be the lowest any stream wants, so debug reaches the files.
    level: 'debug',
    serializers: {
      err: pino.stdSerializers.err,
      // Alias: many call sites log the Error object under `error`. Without this,
      // pino serializes it to `{}` (message/stack are non-enumerable on Error).
      // The std err serializer passes non-Error values (e.g. strings) through unchanged.
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
    // Redact sensitive fields from logs
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
      censor: '[REDACTED]',
    },
  },
  pino.multistream(streams, { dedupe: false })
);

export type Logger = typeof logger;
