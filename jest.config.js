module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/?(*.)+(test|spec).[jt]s?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
