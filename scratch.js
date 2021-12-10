
const queue = []

queue.push(async () => {
  console.log('Task 1 started')
  return (async () => {
    console.log('Task 1 running')
  })().then(() => {
    console.log('Task 1 finished.')
    queue.pop()()
  })
})
queue.push(async () => {
  console.log('Task 2 started')
  return (async () => {
    console.log('Task 2 running')
  })().then(() => {
    console.log('Task 2 finished')
  })
})
 
queue[0]()

