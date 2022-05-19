const b = require('./index')

async function stdoutof() {
  const result = await b.stdoutof`echo Hello`;
  console.log(result);

  const captureOnly = await b.with({ quiet: true }).stdoutof`echo CaptureOnly`;
  console.log(captureOnly)
}

stdoutof()
