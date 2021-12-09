b.js
===

**b.js** is a DSL for calling shell commands in Node, empowered by the new [tagged template literal](https://wesbos.com/tagged-template-literals) syntax. Instead of writing lots of calls to `spawnSync()`, you can just write

```javascript
const runTestSuite = (env, noCoverage) => {
  b`npm install`
  b`docker-compose up -d test_services`
  b`npm run start_test_database --env=${env}`
  b`jest ${noCoverage ?? '--coverage=false'}`
  if (!noCoverage) {
    b`./upload_coverage.sh`
  }
}
```
`b.js` gives you all the expressive power of Bash one-liners, right in your JS code!

Async, but Sequential
---
`b.js` wouldn't be much fun if you had to write this
```javascript
await b`my first command`
await b`a second command`
await b`the third, all in order`
```

However, if we used `spawnSync` under the hood, there'd be lots of fancy things we couldn't do. Such as, we couldn't echo child process **stdout**/**stderr**, while *also* capturing it for you to save to a variable.

`b.js` chooses a hybrid approach. Each `b` tag actually returns a Promise, and if you want access to command results, you have to `await` it.
```javascript
const { status, stdout } = await b`ls -la`
if (status === 0) {
  console.log(stdout)
} else {
  console.log(`ls failed with exit code ${status}`)
}
```

However, `b` secretly chains all of those Promises together, such that one command won't start until the previous one finishes. So for most purposes, you can still treat `b` calls as sequential.

Just remember to wait for them all to finish before you do anything that depends on their side effects.
```javascript
b`unzip big_archive.zip`
const text = readFileSync('big_archive/corpus.txt') // Oops!
                                                    // The file isn't there yet.
```

You can just `await` your last `b` command; it will happen after the others.
```javascript
b`cp a.zip b.zip`
b`unzip b.zip c/`
await b`cat c/corpus.txt | grep ${searchText} > matched.txt`
const matches = readFileSync('matched.txt', 'utf8')
```

Or, you can use `b.waitAll()`, whose promise resolves once `b`'s queue has finished.

### Planned Features
In the future, you'll be able to do things in parallel instead of sequentially with `b.fork`, which "forks" off a new queue of `b` commands.

```javascript
// command 3 will wait for command 1, but not for command 2
b`command 1`
b.fork`command 2`
b`command 3`

// Save a separate `b` instance, whose shell commands will run
// in sequence with themselves, but parallel to the main instance
// (or to other forked instances).
const b2 = b.fork()
b2`command a`
b2`command b`
b2`command c`
await b2.waitAll() // wait for this queue to finish

// Or, pass it a sequence of commands to run in a parallel "thread"
const parallelTask = b.fork((b_) => {
  b_`command theFirst`
  b_`command theSecond`
  b_`command theThird`
})
// It returns a new `b` object, just like `fork()` does.
parallelTask`command oneMoreThingAtTheEnd`
await parallelTask.waitAll()
```

You'll also be able to use `b.bg` to start a command that will keep running after your JS code exits.

Return Signature
---
`b`'s Promises resolve with an object that's identical to the return value of `child_process.spawnSync()`, except that it converts the I/O from Buffers into Strings. The specific structure is
```typescript
{
  pid: number; // PID of the child process
  output: [string, string, string]; // [stdin, stdout, stderr]
  stdout: string; // Identical to output[1]
  stderr: string; // Identical to output[2]
  status: number | null; // Exit code, or null if the process was terminated by a signal
  signal: string | null; // If it was terminated by a signal, the signal used to terminate the process
  error: Error; // The error object if the child process failed or timed out
}
```

Exception Handling
---
Also, unlike `spawnSync()` and other `child_process` APIs, which just set the `error` attribute, `b.js` raises an exception when a process fails to spawn.

By default, `b` also raises an exception if a shell command produces a non-zero exit code. This can be relaxed with `b.mayfail`.

When trying to catch these, keep in mind they will come in as Promise rejections; a call to `b` will not itself throw any of these.

Template Parsing
---

Config
---
**TODO**
```javascript
// Set global flags
b.set({ ... })

// Set for one command
b({ ... })`cmd with settings`

// All options are also available as functions
b.env({ ... })
b.cd('path/to/dir')
b.mayfail()
```

### Options
* **env**
* **cd**
* **mayfail**
* **timeout**


why the name?
---
a single-letter tag to keep it short. `b` as in Bash, a good mnemonic.