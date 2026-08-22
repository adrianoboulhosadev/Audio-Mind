/**
 * Tests the shared kernel (pure, no external dependencies beyond uuid).
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {}],
  },
}
