const spawn = require('cross-spawn')
const { PassThrough } = require('stream')

const startCommand = (prevCmd, cmdString) => new Promise((resolve, reject) => {
  const childProcess = spawn(cmdString, [], { shell: true })

  const capturedIo = ['', '']
  const makePipe = () => new PassThrough()
  const ioCapturePipes = capturedIo.map(makePipe)
  const ioEchoPipes = capturedIo.map(makePipe)

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

  childProcess.on('exit', (code, signal) =>
    code !== null ?
      resolve(resultValue({ code })) :
      reject(resultValue({ signal }))
  )
  childProcess.on('error', err =>
    reject(resultValue({ error: err }))
  )
})