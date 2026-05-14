const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration for monorepo
 *
 * Key adjustments:
 * 1. watchFolders: Tell Metro to also watch the shared package and root node_modules
 * 2. nodeModulesPaths: Resolve modules from root (hoisted by npm workspaces)
 * 3. extraNodeModules: Ensure react/react-native resolve from mobile's node_modules
 *    (prevents "multiple React instances" error)
 */

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const sharedPackage = path.resolve(monorepoRoot, 'packages/shared');

const config = {
  watchFolders: [monorepoRoot, sharedPackage],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    // Ensure these always resolve from the mobile app's node_modules
    // to prevent duplicate module issues
    extraNodeModules: {
      react: path.resolve(projectRoot, 'node_modules/react'),
      'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
    },
    // Block the server app from being bundled
    blockList: [
      /apps\/server\/.*/,
      /infrastructure\/.*/,
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
