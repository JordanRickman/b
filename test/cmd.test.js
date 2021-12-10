const { startCmd } = require('../lib/cmd')


describe('startCmd', () => {
  let cmd
  afterEach(() => {
    // Try to prevent "a worker thread has failed to exit gracefully"
    if (cmd && cmd.childProcess) {
      cmd.childProcess.unref()
    }
  })
  it('returns a Promise', () => {
    cmd = startCmd('echo > /dev/null')
    expect(cmd).toBeInstanceOf(Promise)
  })
  it('captures the status code in the "status" attribute', async () => {
    cmd = startCmd('exit 123')
    const { status } = await cmd
    expect(status).toEqual(123)
  })
  it('captures the process id in the "pid" attribute', async () => {
    cmd = startCmd('echo > /dev/null')
    const { pid } = await cmd
    expect(typeof pid).toBe('number')
  })
  it('captures the stdout as a string', async () => {
    cmd = startCmd('echo "Hello, world!"')
    const { stdout } = await cmd
    expect(stdout).toBe('Hello, world!\n')
  })
  it('captures the stderr as a string', async () => {
    cmd = startCmd('echo "Hello, world!" >&2')
    const { stderr } = await cmd
    expect(stderr).toBe('Hello, world!\n')
  })
  it('captures the termination signal if terminated', async () => {
    cmd = startCmd('sleep 1')
    setTimeout(() => { 
      process.kill(cmd.childProcess.pid, 'SIGTERM')
    }, 50)
    const { signal } = await cmd
    expect(signal).toBe('SIGTERM')
  })
  it('captures the error object if the spawn() failed', async () => {
    // extra options are sent to spawn()
    cmd = startCmd('./nosuchfile', { shell: false })
    const { error } = await cmd
    // child_process errors are not always the same Error class, idk why
    // expect(error).toBeInstanceOf(Error)
    expect(error).toBeDefined()
    expect(error.code).toBe('ENOENT')
  })
})
