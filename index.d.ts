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
  error: Error;
}


type BInstance = (strings: string[], ...interpolations: any[]) => BResult &
{
  with(opts: BOpts, callback?: (b: BInstance) => void): BInstance;
  fork(strings: string[], ...interpolations: any[]): BResult;
  fork(callback: (forkedInstance: BInstance) => void): BInstance;
  fork(): BInstance;
  cd(path: string): BInstance;
  env(environment: { [variableName: string]: string }): BInstance;
  mayfail(strings: string[], ...interpolations: any[]): BResult;
  bg(strings: string[], ...interpolations: any[]): BResult;
  user(username: string): BInstance;
  group(groupname: string): BInstance;
  uid(userid: number): BInstance;
  gid(groupid: number): BInstance;
  timeout(ms: number): BInstance;
  quiet(strings: string[], ...interpolations: any[]): BResult;
  silent(strings: string[], ...interpolations: any[]): BResult;
  echo(strings: string[], ...interpolations: any[]): BResult;
  stdoutof(strings: string[], ...interpolations: any[]): string;
  waitAll(): Promise<void>
}

declare class _SpecialInterpolate {}

declare const b: BInstance & {
  raw(s: string): _SpecialInterpolate;
  squote(s: string): _SpecialInterpolate;
}
