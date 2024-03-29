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
  return optsObjects.reduce((parentOpts, childOpts) => {
    const env = { ...parentOpts.env, ...childOpts.env }
    return { ...parentOpts, ...childOpts, env }
  }, {})
}

const _with = (queue, parentOpts) => (options, callback) => {
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
  ///// Not aliases /////
  bInstance.with = _with(queue, instanceOpts)
  bInstance.fork = _fork(instanceOpts)
  bInstance.waitAll = () => queue.waitAll()
  bInstance.stdoutof = (strings, ...interpolations) =>
    bInstance(strings, ...interpolations).then(result => result.stdout)

  ///// Aliases for b.with({ something }) /////
  // Already chainable, because they take an argument.
  bInstance.cd = path => bInstance.with({ cd: path })
  bInstance.env = env => bInstance.with({ env })
  bInstance.user = username => bInstance.with({ user: username })
  bInstance.group = groupname => bInstance.with({ group: groupname })
  bInstance.uid = uid => bInstance.with({ uid })
  bInstance.gid = gid => bInstance.with({ gid })
  bInstance.timeout = ms => bInstance.with({ timeout: ms })

  // Use getters to make these chainable.
  Object.defineProperties(bInstance, {
    mayfail: { get() { return bInstance.with({ mayfail: true }) } },
    bg: { get() { return bInstance.with({ bg: true }) } },
    quiet: { get() { return bInstance.with({ quiet: true }) } },
    silent: { get() { return bInstance.with({ silent: true }) } },
    echo: { get() { return bInstance.with({ echo: true }) } }
  })
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
