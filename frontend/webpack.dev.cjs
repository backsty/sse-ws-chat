const path = require('path');
const { merge } = require('webpack-merge');
const webpack = require('webpack');
const baseConfig = require('./webpack.config.cjs');

process.env.NODE_ENV = 'development';

module.exports = merge(baseConfig, {
  mode: 'development',
  devtool: 'eval-source-map',
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'dist'),
    },
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization",
      "Content-Security-Policy": [
        "default-src 'self' http://localhost:3000",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:",
        "style-src 'self' 'unsafe-inline'",
        "worker-src 'self' blob:",
        "connect-src 'self' ws://localhost:3000 http://localhost:3000",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "frame-src 'self'"
      ].join('; ')
    },
    proxy: [{
      context: ['/socket.io'],
      target: 'http://localhost:3000',
      ws: true,
      changeOrigin: true
    }],
    compress: true,
    port: 9000,
    open: true,
    hot: true,
    historyApiFallback: true,
    webSocketServer: 'ws'
  },
  plugins: [new webpack.HotModuleReplacementPlugin(),],
});