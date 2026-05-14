/**
 * Simple logger for mobile — wraps console with dev-only output.
 * In production, replace with a proper logging service (Sentry, DataDog, etc.)
 */

const isDev = __DEV__;

export const logger = {
  info: (message: string, ...args: any[]) => {
    if (isDev) console.log(`ℹ️ ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    if (isDev) console.warn(`⚠️ ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    // Always log errors (in prod, send to error tracking service)
    console.error(`❌ ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (isDev) console.debug(`🐛 ${message}`, ...args);
  },
};
