const { merge } = require('webpack-merge');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const baseConfig = require('./webpack.config.cjs');

const ASSET_PATH = process.env.ASSET_PATH || '/ahj-homeworks/http/';

module.exports = merge(baseConfig, {
  mode: 'production',
  devtool: 'source-map',
  output: {
    publicPath: ASSET_PATH,
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
      new CssMinimizerPlugin(),
    ],
  },
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
});