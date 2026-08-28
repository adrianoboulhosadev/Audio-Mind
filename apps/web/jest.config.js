/**
 * Tests the front's own logic and the components whose CONTRACT is easy to break
 * silently. This app had no test at all until a `Field` that was not a
 * forwardRef silently dropped react-hook-form's ref: type-check passed, the
 * build passed, and login stopped working. That is the class of bug these cover.
 *
 * jsdom, not a browser: the point is the component contract, not the pixels.
 */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/test'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@recording/adapters$': '<rootDir>/../../packages/recording/adapters/src/index.ts',
    '^@recording/core$': '<rootDir>/../../packages/recording/core/src/index.ts',
    '^@auth/adapters$': '<rootDir>/../../packages/auth/adapters/src/index.ts',
    '^@auth/core$': '<rootDir>/../../packages/auth/core/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
}
