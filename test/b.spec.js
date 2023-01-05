const b = require('../lib/b')
const { _interpolate } = b
const { runCommandWithOpts } = require('../lib/cmd')

jest.mock('../lib/cmd')


describe('b', () => {
  beforeEach(() => {
    b.config({ globalOpt1: 'one', globalOpt2: 'two' })
  })
  afterEach(() => {
    jest.resetAllMocks()
  })
  afterAll(() => {
    b.config({})
  })
  it('uses the global opts', async () => {
    await b`command string`
    expect(runCommandWithOpts).toHaveBeenCalledWith(
      { env: {}, globalOpt1: 'one', globalOpt2: 'two' },
      'command string'
    )
  })
})

describe('b.with', () => {
  beforeEach(() => {
    b.config({ globalOpt1: 'one', globalOpt2: 'two' })
  })
  afterEach(() => {
    jest.resetAllMocks()
  })
  afterAll(() => {
    b.config({})
  })
  it('uses the global opts when no opts given', async () => {
    await b.with({})`command string`
    expect(runCommandWithOpts).toHaveBeenCalledWith(
      { env: {}, globalOpt1: 'one', globalOpt2: 'two' },
      'command string'
    )
  })
  it('merges passed opts with the global opts', async () => {
    await b.with({ localOpt: 'local' })`command string`
    expect(runCommandWithOpts).toHaveBeenCalledWith(
      { env: {}, globalOpt1: 'one', globalOpt2: 'two', localOpt: 'local' },
      'command string'
    )
  })
  it('can be chained, and keeps merging parent -> child', async () => {
    await b.with({ localOpt1: 'local1' })
           .with({ localOpt2: 'local2' })`command string`
    expect(runCommandWithOpts).toHaveBeenCalledWith(
      { env: {},
        globalOpt1: 'one', globalOpt2: 'two',
        localOpt1: 'local1', localOpt2: 'local2'
      },
      'command string'
    )
  })
  it('merges environment variables', async () => {
    await b.with({ env: { var1: 'val1' } })
           .with({ env: { var2: 'val2' } })`command string`
    expect(runCommandWithOpts).toHaveBeenCalledWith(
      {
        env: { var1: 'val1', var2: 'val2' },
        globalOpt1: 'one', globalOpt2: 'two'
      },
      'command string'
    )
  })
})

const makeTask = (tasks, statuses, label, ms = 0, rejects = false) => {
  const task = () => new Promise((resolve, reject) => {
    if (ms > 0) {
      setTimeout(() => {
        statuses[label] = true
        if (rejects) {
          reject(label)
        } else {
          resolve(label)
        }
      }, ms)
    } else {
      setImmediate(() => {
        statuses[label] = true
        if (rejects) {
          reject(label)
        } else {
          resolve(label)
        }
      })
    }
  })
  statuses[label] = false
  tasks[label] = task
}

const mockWithTasks = tasks => {
  runCommandWithOpts.mockImplementation((opts, commandString) => {
    return tasks[commandString]()
  })
}

describe('b.fork', () => {
  beforeAll(() => {
    jest.useFakeTimers({
      advanceTimers: true
    })
  })
  afterAll(() => {
    jest.resetAllMocks()
    // If we don't clear the task queue before doing useRealTimers(),
    //  we'll be left with promises that never resolve, and later test
    //  suites will fail.
    jest.runAllTimers()
    jest.useRealTimers()
  })
  it('runs a single command in a separate queue', async () => {
    const tasks = {}
    const tasksDone = {}
    makeTask(tasks, tasksDone, 'slow task', 1000)
    makeTask(tasks, tasksDone, 'fast task')
    mockWithTasks(tasks)

    b.fork`slow task`
    await b`fast task`
    expect(tasksDone['fast task']).toBe(true)
    expect(tasksDone['slow task']).toBe(false)

    jest.advanceTimersByTime(1000)
    expect(tasksDone['fast task']).toBe(true)
    expect(tasksDone['slow task']).toBe(true)
  })
  it('creates a new instance with a separate queue', async () => {
    const tasks = {}
    const tasksDone = {}
    makeTask(tasks, tasksDone, 'slow 1', 1000)
    makeTask(tasks, tasksDone, 'slow 2', 1000)
    makeTask(tasks, tasksDone, 'fast')
    mockWithTasks(tasks)

    forked = b.fork()
    const slow1 = forked`slow 1`
    forked`slow 2`
    await b`fast`
    
    expect(tasksDone).toEqual({
      'slow 1': false,
      'slow 2': false,
      fast: true
    })

    jest.advanceTimersByTime(1000)
    expect(tasksDone).toEqual({
      'slow 1': true,
      'slow 2': false,
      fast: true
    })

    /* Task chaining works by calling setImmediate() on the next task,
     * before resolving the current task's Promise. So, aAlthough the actual
     * function for slow1 has executed after doing jest.advanceTimersByTime(1000),
     * we still need to wait for the Promise to resolve, in order to let b
     * execute that task-chaining code. */
    await slow1

    jest.advanceTimersByTime(1000)
    expect(tasksDone).toEqual({
      'slow 1': true,
      'slow 2': true,
      fast: true
    })
  })
  it('passes the forked instance to a callback if given one', async () => {
    const tasks = {}
    const tasksDone = {}
    makeTask(tasks, tasksDone, 'slow 1', 1000)
    makeTask(tasks, tasksDone, 'slow 2', 1000)
    makeTask(tasks, tasksDone, 'slow 3', 1000)
    makeTask(tasks, tasksDone, 'fast')
    mockWithTasks(tasks)
    
    let slow1, slow2
    b.fork(b_ => {
      slow1 = b_`slow 1`
      slow2 = b_`slow 2`
      b_`slow 3`
    })
    expect(slow1).toBeDefined()
    expect(slow2).toBeDefined()
    await b`fast`

    expect(tasksDone).toEqual({
      'slow 1': false,
      'slow 2': false,
      'slow 3': false,
      fast: true
    })

    jest.advanceTimersByTime(1000)
    expect(tasksDone).toEqual({
      'slow 1': true,
      'slow 2': false,
      'slow 3': false,
      fast: true
    })
    await slow1

    jest.advanceTimersByTime(1000)
    expect(tasksDone).toEqual({
      'slow 1': true,
      'slow 2': true,
      'slow 3': false,
      fast: true
    })
    await slow2

    jest.advanceTimersByTime(1000)
    expect(tasksDone).toEqual({
      'slow 1': true,
      'slow 2': true,
      'slow 3': true,
      fast: true
    })
  })
  describe('b.fork.waitAll', () => {
    it('waits for only the forked queue', async () => {
      const tasks = {}
      const tasksDone = {}
      makeTask(tasks, tasksDone, 'fast 1')
      makeTask(tasks, tasksDone, 'fast 2')
      makeTask(tasks, tasksDone, 'slow', 1000)
      mockWithTasks(tasks)

      const forked = b.fork()
      forked`fast 1`
      forked`fast 2`
      b`slow`

      await forked.waitAll()

      expect(tasksDone).toEqual({
        'fast 1': true,
        'fast 2': true,
        slow: false
      })
    })
  })
})

describe('b.waitAll', () => {
  afterAll(() => {
    jest.resetAllMocks()
  })
  it('waits for all commands to finish', async () => {
    const tasks = {}
    const tasksDone = {}
    makeTask(tasks, tasksDone, 'one')
    makeTask(tasks, tasksDone, 'two')
    makeTask(tasks, tasksDone, 'three')
    mockWithTasks(tasks)

    b`one`
    b`two`
    b`three`

    expect(tasksDone).toEqual({
      one: false, two: false, three: false
    })
    await b.waitAll()
    expect(tasksDone).toEqual({
      one: true, two: true, three: true
    })
  })
})

describe('_interpolate', () => {
  it('no interpolations', () => {
    expect(_interpolate``).toEqual('');
    expect(_interpolate`just a string`).toEqual('just a string');
  });
  it('wraps string interpolations in quotes', () => {
    expect(_interpolate`this ${'sub string'} was quoted`).toEqual(
      'this "sub string" was quoted'
    )
  });
  it('escapes quotes within strings', () => {
    expect(_interpolate`this ${'has nested "quotes"'}`).toEqual(
      'this "has nested \\"quotes\\""'
    )
  });
  it('doesn\'t quote numbers', () => {
    expect(_interpolate`this ${'contains'} numbers ${2} and ${1.3}`).toEqual(
      'this "contains" numbers 2 and 1.3'
    )
  });
  it('maps arrays into argument lists', () => {
    expect(_interpolate`mycommand ${[1, 2, 'Hello world']}`).toEqual(
      'mycommand 1 2 "Hello world"'
    )
  });
  it('allows raw strings with b.raw()', () => {
    expect(_interpolate`cmd ${b.raw('1 2 3 "quoted arg"')}`).toEqual(
      'cmd 1 2 3 "quoted arg"'
    )
  });
  it('allows single-quoted strings with b.squote()', () => {
    expect(_interpolate`cmd ${b.squote('Dont let Bash sub this $VARIABLE')}`).toEqual(
      "cmd 'Dont let Bash sub this $VARIABLE'"
    )
  })
  it('ignores null and undefined', () => {
    expect(_interpolate`cmd ${null} ${undefined}`).toEqual('cmd  ')
  })
})
