const path = require('path');
const { merge } = require('webpack-merge');
const webpack = require('webpack');
const baseConfig = require('./webpack.config.cjs');

module.exports =  merge(baseConfig, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'dist'),
      publicPath: '/',
    },
    proxy: [{
      target: 'http://localhost:7070',
      secure: false,
      changeOrigin: true
    }],
    compress: true,
    port: 8080,
    open: false,
    hot: true,
    historyApiFallback: true,
  },
  plugins: [new webpack.HotModuleReplacementPlugin()],
});