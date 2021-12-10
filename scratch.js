
const queue = null

// const _queue = n => {
//   return (queue || Promise.resolve()).then(() => {
//     new Promise((resolve, reject) => { console.log(`Running task ${n}`); resolve() })
//     return null
//   })
// }

// _queue(0)
// _queue(1).then(() => console.log('after 1'))
// _queue(2)

const { startCmd: b } = require('./lib/cmd')
b('read -p "yeah?" x ; echo $x')