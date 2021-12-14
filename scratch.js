const { Queue } = require('./lib/queue')

const makeTask = (label, ms = 0, rejects = false) => {
  return () => new Promise((resolve, reject) => {
    if (ms > 0) {
      setTimeout(() => {
        console.log(label)
        if (rejects) {
          reject(label)
        } else {
          resolve(label)
        }
      }, ms)
    } else {
      setImmediate(() => {
        console.log(label)
        if (rejects) {
          reject(label)
        } else {
          resolve(label)
        }
      })
    }
  })
}

t1 = makeTask('slow 1', 1000)
t2 = makeTask('slow 2', 1000)
t3 = makeTask('fast')
console.log('made.')

const q1 = new Queue()
const q2 = new Queue()
q1.pushTask(t1)
q1.pushTask(t2)
q2.pushTask(t3)
console.log('started.')