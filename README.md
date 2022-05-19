b.js
===

**b** is a DSL for calling shell commands from Node, powered by the [tagged template literal](https://wesbos.com/tagged-template-literals) syntax. Instead of writing lots of calls to `spawnSync()`, you can just write

```javascript
const runTestSuite = (env, noCoverage) => {
  b`npm install`
  b`docker-compose up -d test_services`
  b`./scripts/start_test_database --env=${env}`
  b`jest ${noCoverage ?? '--coverage=false'}`
  b`./scripts/stop_test_database`
  if (!noCoverage) {
    b`./upload_coverage.sh`
  }
}
```
`b` gives you all the expressive power of Bash one-liners, right in your JavaScript code!

### Contents
<details>
  <summary>Table of Contents</summary>

<!-- toc -->

  - [Contents](#contents)
  - [Get it](#get-it)
- [Async, but Sequential](#async-but-sequential)
  - [Parallelization](#parallelization)
- [Exception Handling](#exception-handling)
- [Return Signature](#return-signature)
- [Template Parsing](#template-parsing)
- [Stdio](#stdio)
- [Options](#options)
  - [Set current working directory](#set-current-working-directory)
  - [Set environment variables](#set-environment-variables)
  - [Don't raise an exception on failure](#dont-raise-an-exception-on-failure)
  - [Suppress command output](#suppress-command-output)
  - [Run a process in the background](#run-a-process-in-the-background)
  - [Set user or group of the child process](#set-user-or-group-of-the-child-process)
  - [Timeout process after _n_ milliseconds](#timeout-process-after-n-milliseconds)
- [When _not_ to Use **b**](#when-not-to-use-b)
  - [Security](#security)

<!-- tocstop -->
</details>

### Get it
```
npm i @jordanrickman/b
```


## Async, but Sequential

**b** wouldn't be much fun if you had to write this:
```javascript
await b`my first command`
await b`a second command`
await b`the third, all in order`
```

However, if we used `child_process.spawnSync`, there'd be lots of fancy things we couldn't do. Such as, we couldn't echo child process `stdout`/`stderr`, while *also* capturing it for you to save to a variable.

**b** chooses a hybrid approach. Each `b` tag returns a Promise, and if you want access to command results, you have to `await` that promise (or use `then()`).
```javascript
const { status, stdout } = await b`ls -la`
if (status === 0) {
  console.log(stdout)
} else {
  console.log(`ls failed with exit code ${status}`)
}
```

However, `b` secretly chains all those Promises together, such that one command won't start until the previous one finishes. So for most purposes, you can still treat `b` calls as sequential.

Just remember to wait for them all to finish before you do anything that depends on their side effects.
```javascript
b`unzip big_archive.zip big_archive`
const text = readFileSync('big_archive/data.txt') // Oops!
                                                  // The file isn't there yet.
```

You can just `await` your last `b` command; it will happen after the ones before it.
```javascript
b`cp a.zip b.zip`
b`unzip b.zip c/`
await b`cat c/data.txt | grep ${searchText} > matched.txt`
const matches = readFileSync('matched.txt', 'utf8')
```

Or, you can use `b.waitAll()`, whose promise resolves once `b`'s queue has finished.

### Parallelization

If you need to, you can run things in parallel instead of sequentially with `b.fork`, which "forks" off a new queue of `b` commands.

```javascript
// command 3 will wait for command 1, but not for command 2
b`command 1`
b.fork`command 2`
b`command 3`

// Save a forked `b` instance, whose shell commands will run
// in sequence with themselves, but parallel to the main instance
// (or to other forked instances).
const b2 = b.fork()
b2`command a`
b2`command b`
b2`command c`
await b2.waitAll() // wait for b2's queue to finish

// Or, you can pass fork() a sequence of commands to run in a parallel "thread"
const parallelTask = b.fork((b_) => {
  b_`command theFirst`
  b_`command theSecond`
  b_`command theThird`
})

// It returns a new `b` object, just like `fork()` does.
parallelTask`command oneMoreThingAtTheEnd`
await parallelTask.waitAll()
```

You can also use `b.bg` to start a command that will keep running after your JS code exits.


## Exception Handling

Also, unlike `spawnSync()` and other `child_process` APIs, which just set the `error` attribute, **b** raises an exception when a process fails to spawn.

By default, **b** also raises an exception if a shell command produces a non-zero exit code. This can be relaxed with `b.mayfail`.

When trying to catch these, keep in mind they will come in as Promise rejections; a call to `b` will not itself throw any of these (unless `await`ed).


## Return Signature

`b`'s Promise resolves with the same object structure as that returned by `child_process.spawnSync()`, except that it converts the I/O from Buffers into Strings. The specific type signature is
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


## Template Parsing

`b` applies some smart processing to your template literals. To see all the possibilities, look in `test/b.test.js`, at the test cases for the `_interpolate` function. Some highlights include:

* Strings are wrapped in double quotes.
```javascript
b`cat ${'My File Name.txt'}` // > cat "My File Name.txt"
```

* Use `b.raw` to avoid quoting strings.
```javascript
b`cp ${b.raw('../source ./destination')}` // > cp ../source ./destination
b`ls /path/to/${b.raw('directory')}` // > ls /path/to/directory
```

* Use `b.squote` to single quote / (aka "strong quote") strings
```javascript
b`echo ${b.squote('these variables are $not $read by Bash')}`
// > echo 'these variables are $not $read by Bash'
```

* Arrays are converted to space-separated lists.
```javascript
b`git add ${['file1', 'file 2', 'file3']}` // > git add "file1" "file 2" "file3"
```

* Null and undefined are ignored.
```javascript
b`echo Hello ${undefined}World` // > echo Hello World
b`git add ${['file1', null, 'file 2']}` // > git add "file1" "file 2"
```

* Functions are executed before running the command, but _after_ previous commands have finished. Async functions can be used.
```javascript
b`doSomething > tempfile`
b`echo file contents: ${() => readFileSync('tempfile')}`

b`uploadDocument --id=${docId} myDocument.json`
b`echo uploaded contents: ${async () => docServer.get('/document/'+docId)}`
```


## Stdio

Because **b** was written to help with scripting / automation, it prints stdout and stderr by default, piping them to the stdout/stderr of the parent process. It also pipes the parent process stdin to the child stdin, allowing you to run interactive commands.

You can override this behavior with `b.quiet` and `b.silent`
```javascript
b.quiet`cat averylongfile.txt` // stdout is ignored
b.silent`echo "Don't show this error" >&2` // stdout AND stderr are ignored
```


## Options

You can configure **b** behavior with various options. All options can be set in a few different ways.
```javascript
// Apply one option to a single command
b.optionName('value')`command ${template} as normal`
b.optionName`command` // for a boolean option

// Apply multiple options to a single command
b.with({ optionA: true, optionB: 'value', optionC: true })
// ... or chain them, fluent-style
b.optionA.optionB('value').optionC`command`

// Set options globally
b.config({ optionA: true, optionB: 'value', optionC: true })

// Because you can chain options, you can also save configured instances.
const silentB = b.with({ silent: true })
silentB`command 1`
silentB`command 2`
silentB`command 3`

// Note that unlike fork(), these will still run in the same sequence
// (or, in the sequence of a forked `b` instance they were made from).

// Finally, you can pass a function to with(), which will receive a
// configured `b` instance.
b.with({ optionA: true, optionB: 'value' }, b_ => {
  b_`command 1`
  b_`command 2`
  b_`command 3`
})

// b.with({ ... }).fork(<function>) can be a useful combination.
```

### Set current working directory
```javascript
b.cd('/path/to/directory')`command string`
b.with({ cd: '/path/to/directory' })`command string`
```

### Set environment variables
```javascript
b.env({ VARIABLE_NAME: 'value' })`command string`
b.with({ env: { VARIABLE_NAME: 'value' }})`command string`
```

### Don't raise an exception on failure
```javascript
b.mayfail`command string`
b.with({ mayfail: true })`command string`
```
Default behavior is to raise an exception (Promise rejection) either on a non-zero exit code, or if the child process is terminated by a signal (e.g. Ctrl-C / `SIGINT`). Setting this flag to true disables both cases. Errors will still be raised if the child process fails to start.

### Suppress command output
```javascript
b.quiet`command string` // Don't echo stdout
b.silent`command string` // Don't echo stderr OR stdout
b.with({ quiet: true, silent: true })
```
Default behavior is to pipe `stdout` and `stderr` from the child process to the parent process, meaning the parent will emit these as the child does (and on the same channels). These flags prevent that. You can still access the `stdout` and `stderr` attributes in the Promise result.

### Run a process in the background
```javascript
b.bg`long-running command`
b.with({ bg: true })`long-running command`
```
The process will be fully detached, and will keep running after your JS code quits. We capture no process information apart from PID, and the returned Promise will resolve immediately.

### Set user or group of the child process
```javascript
b.user('username')`command string`
b.group('groupname')`command string`
b.uid(n)`command string`
b.gid(n)`command string`
```

### Timeout process after _n_ milliseconds
```javascript
b.timeout(n)`command string`
b.with({ timeout: n })`command string`
```
After the timeout, we attempt to kill the process using `SIGTERM`. This may not work (the process may catch it).


## When _not_ to Use **b**

I hope primarily to give you a new possibility for flexible, JavaScript-based task automation.

I am not a systems programmer, or an inter-process communication expert. You shouldn't use **b** to manage subprocesses in production code, and you probably shouldn't use it in things like production build chains, where you need a guarantee that certain commands were run with certain exact arguments.

Also, I have made only minimal effort to support non-Unix systems. You're welcome to try it on Windows, but... good luck.

### Security

**b** is a shell command runner. Strings passed into `b` can do anything. Don't pass user input into `b`. Ever.

Why the name?
---
A single-letter tag to keep it short. `b` as in Bash, a good mnemonic for what it does with your string templates.