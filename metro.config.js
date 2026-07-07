const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * IMPORTANT: projectRoot is explicitly set to THIS directory so Metro does NOT
 * crawl the parent monorepo folders (chakraIndustries admin app, backend, etc.)
 * which contain web-only packages like xlsx, react-icons, etc.
 */

const projectRoot = __dirname;

const config = {
  projectRoot,
  watchFolders: [projectRoot],
  resolver: {
    // Block resolution from escaping the project root into sibling folders
    blockList: [
      // Exclude the admin React web app
      new RegExp(path.join(projectRoot, '..', 'chakraIndustries').replace(/\\/g, '\\\\')),
      // Exclude the backend
      new RegExp(path.join(projectRoot, '..', 'chakraIndustries-backend').replace(/\\/g, '\\\\')),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
