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

const mergeOpts = (...optsObjects) => {
  // console.log(`mergeOpts(${JSON.stringify(optsObjects)})`)
  return optsObjects.reduce((parentOpts, childOpts) => {
    const env = { ...parentOpts.env, ...childOpts.env }
    return { ...parentOpts, ...childOpts, env }
  }, {})
}

const _with = (queue, parentOpts) => (options, callback) => {
  // console.log(`_with(parentOpts=${JSON.stringify(parentOpts)})`)
  const childOpts = mergeOpts(globalOpts, parentOpts, options)
  const newBInstance = _b(queue, childOpts)
  setupMethods(newBInstance, queue, childOpts)

  if (callback && typeof callback === 'function') {
    callback(newBInstance)
  } else if (callback) {
    throw new TypeError('Expected function')
  }

  return newBInstance
}

const _fork = parentOpts => (...args) => {
  const newQueue = new Queue()
  const withNewQueue = _with(newQueue, parentOpts)
  
  if (typeof args[0] === 'function') {
    const callback = args[0]
    return withNewQueue({}, callback)
  } else if (Array.isArray(args[0])) {
    const [strings, ...interpolations] = args
    return withNewQueue({})(strings, ...interpolations)
  }
  return withNewQueue({})
}


const setupMethods = (bInstance, queue, instanceOpts) => {
  bInstance.with = _with(queue, instanceOpts)
  bInstance.fork = _fork(instanceOpts)
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

const b = (strings, ...interpolations) =>
  _b(mainQueue, globalOpts)(strings, ...interpolations)

setupMethods(b, mainQueue, {})

b.config = (options) => {
  globalOpts = mergeOpts(globalOpts, options)
}

b._interpolate = _interpolate;
b.raw = raw;
b.squote = squote;


module.exports = b;
