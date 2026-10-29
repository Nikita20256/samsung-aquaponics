const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Keep SVGs intact as XML strings for react-native-svg, including embedded PNGs.
config.transformer.babelTransformerPath = require.resolve('./svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts.push('svg');

// An optional development-only gateway lets an Android phone use the Expo tunnel for API calls.
// JWT authentication still runs in the backend; the additional key is delivered only in the QR.
const { createDevApiProxy } = require('./scripts/metro-api-proxy.cjs');
const previousMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const metro = previousMiddleware ? previousMiddleware(middleware, server) : middleware;
  const proxy = createDevApiProxy(process.env.AQUAPONICS_DEV_PROXY_KEY);
  return (req, res, next) => proxy(req, res, () => metro(req, res, next));
};

module.exports = config;
