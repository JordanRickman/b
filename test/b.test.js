const { _b } = require('../lib/b');

test('b', () => {
  expect(_b``).toEqual('');
  expect(_b`just a string`).toEqual('just a string');
  expect(_b`this ${'string'} has ${2} substitutions`).toEqual(
    'this "string" has "2" substitutions'
  );
});
