module.exports = {
  displayName: 'api',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js'],
  testMatch: ['**/+(*.)+(spec|test).+(ts|js)?(x)'],
  moduleNameMapper: {
    '^@proyecto-base/shared$': '<rootDir>/../libs/shared/src/index.ts',
  },
  coverageDirectory: '../coverage/api',
};
