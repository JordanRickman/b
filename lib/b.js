const { uid, gid } = require('userid')
const { startCmd } = require('./cmd')

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

class BShellError extends Error {
  constructor(bResult, cmd, msg) {
    super(msg)
    this.name = 'BShellError'
    this.result = bResult
    this.command = cmd
  }
}

const _b = (queue, {
  cd,
  env,
  bg,
  user,
  group,
  mayfail
}) => (strings, ...interpolations) => {
  const cmdString = _interpolate(strings, ...interpolations)
  queue.push(async () => {
    queue.isRunning = true
    return startCmd(cmdString, {
      cwd: cd,
      env: env,
      detached: bg,
      uid: uid(user),
      gid: gid(group)
    })
    .then((result) => {
      queue.isRunning = false
      if (result.error) {
        throw new BShellError(
          result, cmdString, 'Failed to execute command'
        )
      }
      if (!mayfail && result.signal) {
        throw new BShellError(
          result, cmdString, `Shell process terminated with signal ${result.signal}`
        )
      }
      if (!mayfail && result.status !== 0) {
        throw new BShellError(
          result, cmdString, `Shell process returned non-zero exit code - ${result.status}`
        )
      }

      if (queue.length > 0) {
        queue.pop()()
      } else {
        
      }
    })
  })
}

const _bInstance = opts => {

}

function _fork(opts) {
  const queue = []
  queue.isRunning = false
  const resume = () => {
    if (queue.isRunning) {
      return
    }
    if (queue.length > 0) {
      queue.doNext()
    }
  }

  queue.doNext = () => {

  }

  const waitAll = () => {
    
  }
}

function b() {

}

b._interpolate = _interpolate;
b.raw = raw;
b.squote = squote;
module.exports = b;
