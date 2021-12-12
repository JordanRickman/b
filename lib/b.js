const userid = require('userid')
const { runCommandWithOpts } = require('./cmd')
const { queueTask } = require('./queue')

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

const _b = (prevCmd, opts) => (strings, ...interpolations) =>
  queueTask(prevCmd, () => {
    const cmdString = _interpolate(strings, ...interpolations)
    // prevCmd.isRunning = true
    return runCommandWithOpts(opts, cmdString)
  })


let prevCmd;
let opts = {};
function b(string, ...interpolations) {
  prevCmd = _b(prevCmd, opts)(string, ...interpolations)
  return prevCmd
}

b._interpolate = _interpolate;
b.raw = raw;
b.squote = squote;
module.exports = b;
