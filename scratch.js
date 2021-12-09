const spawn = require('cross-spawn');
const { PassThrough } = require('stream');

let s = ''
new Promise((resolve, reject) => {
  const ls = spawn('npm install', [], { shell: true })
  const a = PassThrough();
  const b = PassThrough();
  ls.stdout.pipe(a)
  ls.stdout.pipe(b)

  a.on('data', data => s += String(data))
  b.pipe(process.stdout)
  ls.on('exit', code => {
    if (typeof code === 'string') {
      // Terminated by signal
      reject(`subprocess Terminated by ${code}`);
    } else {
      console.log(`subprocess exited with code ${code}`);
      resolve(code)
    }
  })
}).then(() => {
  console.log(`s=\n${s}`);
})
