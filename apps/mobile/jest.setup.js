// Reanimated's jest mock — drives animations synchronously in tests.
require('react-native-reanimated').setUpTests();

// Libraries below touch NativeModules at import time, which doesn't exist in jest.
jest.mock('react-native-tts', () => ({
  getInitStatus: jest.fn(() => Promise.resolve('success')),
  speak: jest.fn(),
  stop: jest.fn(),
  setDefaultLanguage: jest.fn(() => Promise.resolve()),
  setDefaultRate: jest.fn(),
  setDefaultPitch: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  removeAllListeners: jest.fn(),
}));

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.resolve(true)),
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  resetGenericPassword: jest.fn(() => Promise.resolve(true)),
}));
