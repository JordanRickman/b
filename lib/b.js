const userid = require('userid')
const { runCommandWithOpts } = require('./cmd')
const { Queue } = require('./queue')

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

const _b = (queue, opts) => (strings, ...interpolations) =>
  queue.pushTask(() => {
    const cmdString = _interpolate(strings, ...interpolations)
    return runCommandWithOpts(opts, cmdString)
  })

const setupMethods = (bInstance, queue, opts) => {
  bInstance.with = with_(queue, opts)
  bInstance.cd = path => bInstance.with({ cd: path })
  bInstance.env = env => bInstance.with({ env })
  bInstance.mayfail = (strings, ...interpolations) =>
    bInstance.with({ mayfail: true })(strings, ...interpolations)
  bInstance.bg = (strings, ...interpolations) =>
    bInstance.with({ bg: true })(strings, ...interpolations)
  bInstance.user = username => bInstance.with({ user: username })
  bInstance.group = groupname => bInstance.with({ group: groupname })
  bInstance.uid = uid => bInstance.with({ uid })
  bInstance.gid = gid => bInstance.with({ gid })
  bInstance.timeout = ms => bInstance.with({ timeout: ms })
  bInstance.quiet = (strings, ...interpolations) =>
    bInstance.with({ quiet: true })(strings, ...interpolations)
  bInstance.silent = (strings, ...interpolations) =>
    bInstance.with({ silent: true })(strings, ...interpolations)
}


let mainQueue = new Queue()
let globalOpts = {}

function b(strings, ...interpolations) {
  _b(mainQueue, globalOpts)(strings, ...interpolations)
}


const mergeOpts = (opts, options) => {
  const env = { ...opts.env, ...options.env }
  return { ...opts, ...options, env }
}

const config = (options) => {
  globalOpts = mergeOpts(globalOpts, options)
}

// "with" is a keyword
const with_ = (queue, opts) => (options, callback) => {
  const newOpts = mergeOpts(opts, options)
  const newBInstance = _b(queue, newOpts)
  if (callback && typeof callback === 'function') {
    callback(newBInstance)
  } else if (callback) {
    throw new TypeError('Expected function')
  }
}
b.with = with_(mainQueue, globalOpts)





b._interpolate = _interpolate;
b.raw = raw;
b.squote = squote;
b.config = config;


module.exports = b;
