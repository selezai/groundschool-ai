// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add any custom configurations here
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];

// Support for symlinks (if used)
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Support for hermes
config.transformer.enableBabelRCLookup = false;

module.exports = config;
