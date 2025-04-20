module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|expo-modules-core|expo-file-system|expo-sharing|expo-font|@expo/vector-icons|@react-native-community|@react-native-async-storage|@unimodules|@react-navigation|@testing-library|@testing-library/jest-native|@testing-library/react-native|react-native-gesture-handler)/)',
  ],
  moduleNameMapper: {
    '^@react-native/assets-registry/registry$': '<rootDir>/__mocks__/assetsRegistry.js',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx}',
    '!src/theme/**',
    '!**/node_modules/**',
  ],
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testMatch: ['**/__tests__/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  watchPathIgnorePatterns: ['<rootDir>/node_modules/'],
  verbose: true,
};
