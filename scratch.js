// const { startCmd: b } = require('./lib/cmd')
// b('read -p "yeah?" x ; echo $x')

const queue = null

const _queue = (n, rejects = false) => {
  return (queue || Promise.resolve()).then(() => {
    return new Promise((resolve, reject) =>
      setImmediate(() => {
        console.log(`Running task ${n}`)
        if (rejects) {
          reject()
        }
        resolve()
      })
    )
  })
}

// _queue(0)
// _queue(1).then(() => console.log('after task 1'))
// _queue(2, true)
// _queue(3)
// console.log('queue 4 things')

const queueTask = (prevCmd, task) => {
  return prevCmd.then(() =>
    // return a Promise,
    // that starts after the previous task
    //  (b/c of then()), ...
    new Promise((resolve, reject) => {
      // ... that queues work for the next event loop, ...
      setImmediate(async () => {
        // ... work which runs the task, ...
        try {
          const result = await task()
          // ... and which resolves that Promise with
          //  the task's result, ...
          resolve(result)
        } catch (error) {
          // ... or rejects if the task fails.
          reject(error)
        }
      })
    })
  )
}

const makeTask = (n, rejects = false) => () =>
  new Promise((resolve, reject) => {
    console.log(`Running: Task ${n}`)
    if (rejects) {
      reject(`Failed: Task${n}`)
    }
    resolve()
  })

let prev = Promise.resolve()
prev = queueTask(prev, makeTask(1))
prev = queueTask(prev, makeTask(2))
prev.then(() => console.log('then() after 2'))
prev = queueTask(prev, makeTask(3))
console.log('end sync code')
