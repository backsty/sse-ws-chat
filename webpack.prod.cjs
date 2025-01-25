const { merge } = require('webpack-merge');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const baseConfig = require('./webpack.config.cjs');

const ASSET_PATH = process.env.ASSET_PATH || '/sse-ws-chat/';

module.exports = merge(baseConfig, {
  mode: 'production',
  devtool: 'source-map',
  output: {
    publicPath: ASSET_PATH,
    clean: true
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      name: false
    },
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: ['default', { discardComments: { removeAll: true } }]
        }
      }),
    ],
    runtimeChunk: 'single',
    moduleIds: 'deterministic',
  },
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
});
