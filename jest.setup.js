global.fetch = require('jest-fetch-mock');
global.localStorage = require('jest-localstorage-mock');

// Отключаем console.error в тестах
console.error = jest.fn();