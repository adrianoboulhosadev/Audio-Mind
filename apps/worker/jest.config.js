/**
 * Tests the worker's own pure logic (the LLM response mapper and the summary
 * prompt/pdf helpers). The context packages and shared resolve directly from
 * source (no prior build).
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  moduleNameMapper: {
    '^shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@recording/adapters$': '<rootDir>/../../packages/recording/adapters/src/index.ts',
    '^@recording/core$': '<rootDir>/../../packages/recording/core/src/index.ts',
    '^@transcription/adapters$': '<rootDir>/../../packages/transcription/adapters/src/index.ts',
    '^@transcription/core$': '<rootDir>/../../packages/transcription/core/src/index.ts',
    '^@summary/adapters$': '<rootDir>/../../packages/summary/adapters/src/index.ts',
    '^@summary/core$': '<rootDir>/../../packages/summary/core/src/index.ts',
    '^@notification/adapters$': '<rootDir>/../../packages/notification/adapters/src/index.ts',
    '^@notification/core$': '<rootDir>/../../packages/notification/core/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {}],
  },
}
