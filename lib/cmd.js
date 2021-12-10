const spawn = require('cross-spawn')
const { PassThrough } = require('stream')

const startCmd = (cmdString, spawnOpts = {}) => {
  const childProcess = spawn(cmdString, [], {
    shell: true,
    stdio: spawnOpts.detached ? 'ignore' : undefined,
    ...spawnOpts
  })

  const capturedIo = ['', '']
  const makePipe = () => new PassThrough()
  const ioCapturePipes = capturedIo.map(makePipe)
  const ioEchoPipes = capturedIo.map(makePipe)

  if ( spawnOpts.detached ) {
    childProcess.unref()
  } else {
    childProcess.stdio.slice(1).forEach((pipe, i) => {
      pipe.pipe(ioCapturePipes[i])
      pipe.pipe(ioEchoPipes[i])
    })
    ioEchoPipes.forEach((pipe, i) => pipe.on('data', 
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
    process.stdin.unpipe(childProcess.stdin)
    resolve(result)
  }
  
  const promise = new Promise((resolve, reject) => {
    if (spawnOpts.detached) {
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

module.exports = {
  startCmd
}