const b = require('./index')

async function stdoutof() {
  const result = await b.stdoutof`echo Hello`;
  console.log(result);

  const captureOnly = await b.with({ quiet: true }).stdoutof`echo CaptureOnly`;
  console.log(captureOnly)
}

// stdoutof()

async function forking() {
  const b2 = b.fork()
  b2`sleep 1; echo "b2: 1 seconds passed"; sleep 4; echo "b2: finished after 5 seconds"`
  await b`sleep 2; echo "b1: 2 seconds passed"; sleep 1; echo "b1: finished after 3 seconds"`
  await b2.waitAll()
}

// forking()

async function waitAll() {
  b`sleep 1; echo "1 second passed."`
  b`sleep 1; echo "another second passed."`
  b`sleep 1; echo "3 seconds passed."`
  await b.waitAll()
  console.log('done after 3 seconds')
}

waitAll()