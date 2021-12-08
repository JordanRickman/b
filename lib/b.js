const spawn = require('cross-spawn');

function _b(strings, ...substitutions) {
  const quoted = substitutions.map((s) => `"${s}"`);
  return strings.reduce((acc, s, i) => acc + s + (quoted[i] || ''), '');
}

function b(strings, ...substitutions) {
  const commandString = _b(strings, ...substitutions);
  const results = spawn.sync(commandString);
  const io_text = results.output.map(buffer => (
    buffer ? buffer.toString('utf-8') : null
  ));
  return {
    pid: results.pid,
    output: io_text,
    stdin: io_text[0],
    stdout: io_text[1],
    stderr: io_text[2],
    status: results.status,
    error: results.error
  }
}

b._b = _b;
module.exports = b;
