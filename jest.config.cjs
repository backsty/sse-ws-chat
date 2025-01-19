module.exports = {
  // Основные настройки
  verbose: true,
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'json'],

  // Трансформации
  transform: {
    '^.+\\.js$': 'babel-jest',
  },

  // Игнорируемые пути
  testPathIgnorePatterns: [
    'node_modules',
    'dist',
    'coverage',
  ],

  // Настройки покрытия
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Моки и маппинги
  moduleNameMapper: {
    '\\.css$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },

  // Настройки тестов
  testMatch: [
    '<rootDir>/src/**/*.test.js',
    '<rootDir>/src/**/__tests__/**/*.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Дополнительные настройки
  maxWorkers: '50%',
  testTimeout: 5000,

  // Очистка моков
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};