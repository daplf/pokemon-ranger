module.exports = {
  transform: {
    '\\.[jt]sx?$': ['babel-jest'],
  },
  testEnvironment: 'jsdom',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
};
