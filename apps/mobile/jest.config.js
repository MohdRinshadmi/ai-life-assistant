module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  // Same as the preset's default, plus reanimated/worklets (they ship untranspiled ESM).
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|react-native-.*|@react-native(-community)?|@react-native-voice|@react-navigation)/)',
  ],
  // Routes worklets imports to their non-native variants so tests don't touch
  // the C++ runtime.
  resolver: 'react-native-worklets/jest/resolver.js',
};
