/* eslint-disable no-param-reassign */
// eslint-disable-next-line import/no-extraneous-dependencies
const webpack = require("webpack");

const webpackOverride = (config) => {
  const fallback = config.resolve.fallback || {};
  Object.assign(fallback, {
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    assert: require.resolve("assert"),
    http: require.resolve("stream-http"),
    https: require.resolve("https-browserify"),
    os: require.resolve("os-browserify"),
    path: require.resolve("path-browserify"),
    url: require.resolve("url"),
    fs: false,
    vm: require.resolve("vm-browserify"),
  });
  config.resolve.fallback = fallback;
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: "process/browser.js",
      Buffer: ["buffer", "Buffer"],
    }),
  ]);
  config.ignoreWarnings = [/Failed to parse source map/];
  return config;
};

module.exports = {
  webpack: webpackOverride,
  jest: (config) => {
    // Unit tests exercise TEZEX's wallet boundaries rather than Beacon's own
    // crypto/transport implementation. Mapping Beacon to a small local double
    // avoids CRA 5/Jest 27's inability to load Beacon's modern ESM graph.
    config.moduleNameMapper = {
      ...(config.moduleNameMapper || {}),
      "^@airgap/beacon-(?:sdk|dapp)$": "<rootDir>/src/test/beaconMock.ts",
    };
    return config;
  },
};
