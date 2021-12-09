const spawn = require('cross-spawn');

class _SpecialInterpolate {
  constructor(s) {
    this.value = s
  }
}

class _Raw extends _SpecialInterpolate {}
// b.raw(string) does no quoting
function raw(string) {
  return new _Raw(string)
}

class _SQuote extends _SpecialInterpolate {}
// b.squote(string) wraps in single quotes
function squote(string) {
  return new _SQuote(string)
}

function _interpolate(strings, ...interpolations) {
  const quote = s => `"${s.replace(/"/g, '\\"')}"`
  const processed = interpolations.map(item => {
    if (item === undefined || item === null) {
      return ''
    }
    if (typeof item === 'string') {
      return quote(item);
    }
    if (Array.isArray(item)) {
      return item.map(a => (
        a === undefined || a === null ? '' :
          typeof a === 'string' ? quote(a) : String(a)
      )).join(' ')
    }
    if (item instanceof _SQuote) {
      return `'${item.value}'`
    }
    if (item instanceof _Raw) {
      return item.value
    }
    return String(item);
  });
  return strings.reduce((acc, s, i) => acc + s + (processed[i] || ''), '');
}

function b(strings, ...interpolations) {
  const commandString = _interpolate(strings, ...interpolations);
  const results = spawn.sync(commandString, [], { shell: true });
  const io_text = results.output.map(buffer => (
    buffer ? buffer.toString('utf-8') : null
  ));
  return {
    pid: results.pid,
    output: io_text,
    stdin: io_text[0],
    stdout: io_text[1],
    stderr: io_text[2],
    status: results.status,
    error: results.error
  }
}

b._interpolate = _interpolate;
b.raw = raw;
b.squote = squote;
module.exports = b;
