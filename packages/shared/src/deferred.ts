export type Deferred<T, I = any, D = any> = {
  id?: I;
  data?: D;
  promise: Promise<T>;
  resolve: (t: T) => void;
  reject: (e: Error) => void;
};

export function createDeferred<T, I = any, D = any>(arg?: I, data?: D): Deferred<T, I, D> {
  let localResolve: (t: T) => void = (_t: T) => {};
  let localReject: (e?: Error) => void = (_e?: Error) => {};
  let id: I | undefined;

  // eslint-disable-next-line no-async-promise-executor
  const promise: Promise<T> = new Promise(async (resolve, reject) => {
    localResolve = resolve;
    localReject = reject;
    if (typeof arg === 'function') {
      try {
        await arg();
      } catch (error) {
        reject(error);
      }
    }
    if (typeof arg === 'string') id = arg;
  });

  return {
    id,
    data,
    resolve: localResolve,
    reject: localReject,
    promise,
  };
}
