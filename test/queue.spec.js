const { queueTask } = require('../lib/queue');


const makeTasks = n => {
  const taskHappenedArray = new Array(n).fill(null);
  const taskArray = new Array(n).fill(null);
  taskArray.map((_, i) => {
    taskArray[i] = () => {
      taskHappenedArray[i] = `Ran ${i}`;
      return `Result ${i}`;
    }
  })
  return [taskArray, taskHappenedArray]
}

const queueTasksInSequence = taskArray => {
  const taskPromiseArray = new Array(taskArray.length).fill(null);
  taskArray.forEach((task, i) => {
    taskPromiseArray[i] = queueTask(taskPromiseArray[i-1], task)
  })
  return taskPromiseArray;
}

describe('queueTask', () => {
  it('run tasks asynchronously in sequence', async () => {
    const [taskArray, taskHappenedArray] = makeTasks(3)
    const taskPromiseArray = queueTasksInSequence(taskArray)
    taskPromiseArray.map(async (taskPromise, i) => {
      expect(taskHappenedArray[i]).toBe(null);
      await taskPromise;
      expect(taskHappenedArray[i]).toBe(`Ran ${i}`);
    })
  })
  it('lets you attach other tasks in between', async () => {
    const [taskArray, taskHappenedArray] = makeTasks(3)
    const taskPromiseArray = queueTasksInSequence(taskArray)
    taskPromiseArray[1].then(() => {
      expect(taskHappenedArray[1]).toBe(`Ran ${1}`) // task has happened
      expect(taskHappenedArray[2]).toBe(null) // next task hasn't happened yet
    })
  })
  it('resolves each promise with the task\'s return value', async () => {
    const [taskArray, taskHappenedArray] = makeTasks(3)
    const taskPromiseArray = queueTasksInSequence(taskArray)
    taskPromiseArray.map(async (taskPromise, i) => {
      expect(await taskPromise).toBe(`Result ${i}`);
    })
  })
})
