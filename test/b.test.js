const b = require('../lib/b');
const { _interpolate } = b;

describe('_interpolate', () => {
  it('no interpolations', () => {
    expect(_interpolate``).toEqual('');
    expect(_interpolate`just a string`).toEqual('just a string');
  });
  it('wraps string interpolations in quotes', () => {
    expect(_interpolate`this ${'sub string'} was quoted`).toEqual(
      'this "sub string" was quoted'
    )
  });
  it('escapes quotes within strings', () => {
    expect(_interpolate`this ${'has nested "quotes"'}`).toEqual(
      'this "has nested \\"quotes\\""'
    )
  });
  it('doesn\'t quote numbers', () => {
    expect(_interpolate`this ${'contains'} numbers ${2} and ${1.3}`).toEqual(
      'this "contains" numbers 2 and 1.3'
    )
  });
  it('maps arrays into argument lists', () => {
    expect(_interpolate`mycommand ${[1, 2, 'Hello world']}`).toEqual(
      'mycommand 1 2 "Hello world"'
    )
  });
  it('allows raw strings with b.raw()', () => {
    expect(_interpolate`cmd ${b.raw('1 2 3 "quoted arg"')}`).toEqual(
      'cmd 1 2 3 "quoted arg"'
    )
  });
  it('allows single-quoted strings with b.squote()', () => {
    expect(_interpolate`cmd ${b.squote('Dont let Bash sub this $VARIABLE')}`).toEqual(
      "cmd 'Dont let Bash sub this $VARIABLE'"
    )
  })
  it('ignores null and undefined', () => {
    expect(_interpolate`cmd ${null} ${undefined}`).toEqual('cmd  ')
  })
});
