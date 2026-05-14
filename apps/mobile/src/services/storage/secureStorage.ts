import * as Keychain from 'react-native-keychain';
import { logger } from '../../utils/logger';

/**
 * Secure Token Storage — react-native-keychain
 *
 * Why Keychain over AsyncStorage?
 * - AsyncStorage: Unencrypted, stored in plain text on disk
 * - Keychain (iOS) / Keystore (Android): Hardware-backed encryption
 * - Tokens are the keys to the kingdom — they MUST be encrypted at rest
 *
 * We store both access + refresh tokens as a single JSON blob
 * under a single keychain entry for atomic read/write.
 */

const SERVICE_NAME = 'ai-life-assistant-auth';

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export const secureStorage = {
  async saveTokens(tokens: StoredTokens): Promise<boolean> {
    try {
      const result = await Keychain.setGenericPassword(
        'auth-tokens',
        JSON.stringify(tokens),
        { service: SERVICE_NAME }
      );
      return result !== false;
    } catch (error) {
      logger.error('Failed to save tokens to secure storage', error);
      return false;
    }
  },

  async getTokens(): Promise<StoredTokens | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: SERVICE_NAME,
      });

      if (!credentials) {
        return null;
      }

      return JSON.parse(credentials.password) as StoredTokens;
    } catch (error) {
      logger.error('Failed to read tokens from secure storage', error);
      return null;
    }
  },

  async clearTokens(): Promise<boolean> {
    try {
      const result = await Keychain.resetGenericPassword({
        service: SERVICE_NAME,
      });
      return result;
    } catch (error) {
      logger.error('Failed to clear tokens from secure storage', error);
      return false;
    }
  },
};
