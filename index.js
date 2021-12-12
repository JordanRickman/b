const b = require('./lib/b');

(async () => {
  b`sleep 1; echo 'Hello, world' > FILE1`
  b`cat FILE1 > FILE2`
  console.log(`File contents: ${(await b`cat FILE2`).stdout}`)
  b`rm FILE1`
  b`rm FILE2`
})()
