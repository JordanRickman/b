const b = require('./lib/b');
const { startCommand } = require('./lib/cmd');

const p = startCommand('./nosuchfile', { shell: false })
p.then(console.log)
// p.then(console.log).catch(data => {
//   console.log(data)
//   process.exit()
// })
// const { pid } = p.childProcess
// setTimeout(() => {
//   process.kill(pid, 'SIGTERM')
// }, 100)
