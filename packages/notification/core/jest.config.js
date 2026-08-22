/**
 * Tests the (rich) notification core. The in-memory fakes of the ports live in
 * test/in-memory. `shared` is resolved directly from source (no prior build).
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  moduleNameMapper: {
    '^shared$': '<rootDir>/../../shared/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {}],
  },
}
