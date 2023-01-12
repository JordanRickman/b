interface BOpts {
  cd?: string;
  env?: { [s: string]: string };
  bg?: boolean;
  user?: string;
  group?: string;
  uid?: number;
  gid?: number;
  mayfail?: boolean;
  timeout?: number;
  quiet?: boolean;
  silent?: boolean;
  echo?: boolean;
}

interface BResult {
  pid: number;
  output: [string, string, string];
  stdout: string;
  stderr: string;
  status: number | null;
  signal: string | null;
  error?: BShellError;
}


type BInstance = ((strings: TemplateStringsArray, ...interpolations: any[]) => BResult) &
{
  with(opts: BOpts, callback?: (b: BInstance) => void): BInstance;
  
  fork(strings: TemplateStringsArray, ...interpolations: any[]): BResult;
  fork(callback: (forkedInstance: BInstance) => void): BInstance;
  fork(): BInstance;

  waitAll(): Promise<void>
  
  stdoutof(strings: TemplateStringsArray, ...interpolations: any[]): string;

  cd(path: string): BInstance;
  env(environment: { [variableName: string]: string }): BInstance;
  user(username: string): BInstance;
  group(groupname: string): BInstance;
  uid(userid: number): BInstance;
  gid(groupid: number): BInstance;
  timeout(ms: number): BInstance;

  mayfail(strings: TemplateStringsArray, ...interpolations: any[]): BResult;
  mayfail: BInstance;

  quiet(strings: TemplateStringsArray, ...interpolations: any[]): BResult;
  quiet: BInstance;

  silent(strings: TemplateStringsArray, ...interpolations: any[]): BResult;
  silent: BInstance;

  echo(strings: TemplateStringsArray, ...interpolations: any[]): BResult;
  echo: BInstance;

  bg(strings: TemplateStringsArray, ...interpolations: any[]): BResult;
  bg: BInstance;
}

declare class _SpecialInterpolate {}

declare const b: BInstance & {
  raw(s: string): _SpecialInterpolate;
  squote(s: string): _SpecialInterpolate;
}
export = b

declare class BShellError extends Error {
  name: 'BShellError';
  result: BResult;
  command: string;
}
