/**
 * Helpers for managing sequential work in "queues".
 * (No actual queues involved, it's all
 * chains of Promises.)
 */

/**
 * Queue a task to happen after a previous Task.
 * 
 * @param {Promise} prevTask Previous task to wait for
 * @param {function} task Task to run
 */
const queueTask = (prevTask = Promise.resolve(), task) => {
  return prevTask.then(() =>
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

module.exports = {
  queueTask
}
