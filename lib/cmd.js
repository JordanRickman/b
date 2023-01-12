const spawn = require('cross-spawn')
const { PassThrough } = require('stream')

const runCommand = (
  cmdString, spawnOpts = {},
  quiet = false, silent = false, echo = false
) => {
  if ( echo ) {
    console.log(cmdString)
  }
  const { detached } = spawnOpts
  const childProcess = spawn(cmdString, [], {
    shell: true,
    stdio: detached ? 'ignore' : undefined,
    ...spawnOpts
  })

  const capturedIo = ['', '']
  const makePipe = () => new PassThrough()
  const ioCapturePipes = capturedIo.map(makePipe)
  const ioEchoPipes = capturedIo.map(makePipe)

  if ( detached ) {
    childProcess.unref()
  } else {
    childProcess.stdout.pipe(ioCapturePipes[0])
    childProcess.stderr.pipe(ioCapturePipes[1])
    if (!silent) {
      childProcess.stderr.pipe(ioEchoPipes[1])
      if (!quiet) {
        childProcess.stdout.pipe(ioEchoPipes[0])
      }
    }

    ioCapturePipes.forEach((pipe, i) => pipe.on('data', 
      data => capturedIo[i] += `${data}`
    ))
    ioEchoPipes[0].pipe(process.stdout)
    ioEchoPipes[1].pipe(process.stderr)

    process.stdin.pipe(childProcess.stdin)
  }

  const resultValue = ({ status, signal, error }) => (
    {
      pid: childProcess.pid,
      output: [
        null, // TODO
        capturedIo[0],
        capturedIo[1],
      ],
      stdin: null, // TODO
      stdout: capturedIo[0],
      stderr: capturedIo[1],
      status,
      signal,
      error,
    }
  )

  const closePromise = (resolve, resultOpts) => {
    result = resultValue(resultOpts)
    // Close all open pipes
    ioCapturePipes.forEach(pipe => pipe.end())
    ioEchoPipes.forEach(pipe => pipe.end())
    childProcess.stdio.slice(1).forEach((pipe, i) => {
      pipe.unpipe(ioCapturePipes[i])
      pipe.unpipe(ioEchoPipes[i])
    })
    // Without the pause() here, client code will stay running until the user hits Enter.
    // For some reason, you have to call pause() *before* calling unpipe(), at least
    // on Mac.
    // Google searches suggest fixing the "stdin doesn't close after detaching listener"
    // problem by calling unref(), but this has the problem of preventing later code from
    // using stdin.
    process.stdin.pause()
    process.stdin.unpipe(childProcess.stdin)
    resolve(result)
  }
  
  const promise = new Promise((resolve, reject) => {
    if (detached) {
      resolve()
    } else {
      childProcess.on('exit', (code, signal) =>
        code !== null ?
          closePromise(resolve, { status: code }) :
          closePromise(resolve, { signal })
      )
      childProcess.on('error', err =>
        closePromise(resolve, { error: err })
      )
    }
  })

  promise.childProcess = childProcess

  return promise
}


class BShellError extends Error {
  constructor(bResult, cmd, cause, msg) {
    super(msg)
    this.name = 'BShellError'
    this.result = bResult
    this.command = cmd
    this.cause = cause
  }
}

const handleErrors = (result, cmdString, mayfail) => {
  if (result.error) {
    throw new BShellError(
      result, cmdString, result.error, 'Failed to execute command'
    )
  }
  if (!mayfail && result.signal) {
    throw new BShellError(
      result, cmdString, null, `Shell process terminated with signal ${result.signal}`
    )
  }
  if (!mayfail && result.status !== 0) {
    throw new BShellError(
      result, cmdString, null, `Shell process returned non-zero exit code - ${result.status}`
    )
  }
}

const runCommandWithOpts = async ({
  cd,
  env,
  bg,
  user,
  group,
  uid,
  gid,
  mayfail,
  timeout,
  quiet,
  silent,
  echo,
} = {}, cmdString) => {
  const runPromise = runCommand(cmdString, {
    cwd: cd,
    env: env ? { ...process.env, ...env } : undefined,
    detached: bg,
    uid: uid || user ? userid.uid(user) : undefined,
    gid: gid || group ? userid.gid(group) : undefined
  }, quiet === true, silent === true, echo === true)
  if (timeout) {
    setTimeout(() => {
      process.kill(runPromise.childProcess.pid, 'SIGTERM')
    }, timeout)
  }
  const result = await runPromise
  handleErrors(result, cmdString, mayfail)
  return result
}

module.exports = {
  runCommand,
  runCommandWithOpts
};
