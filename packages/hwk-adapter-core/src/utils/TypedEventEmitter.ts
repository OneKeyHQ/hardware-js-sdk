/**
 * Minimal typed event emitter using Map<string, Set<listener>>.
 * Each adapter uses this for device events (connect, disconnect, pin, etc.).
 *
 * TMap is a record mapping event name strings to their payload types.
 * Example:
 *   type MyEvents = { 'connect': { id: string }; 'disconnect': { id: string } };
 *   const emitter = new TypedEventEmitter<MyEvents>();
 *   emitter.on('connect', (data) => { data.id }); // data is { id: string }
 *
 * For backward compatibility, TMap defaults to Record<string, any> so that
 * existing code using `new TypedEventEmitter<SomeUnionType>()` still compiles.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TypedEventEmitter<TMap extends Record<string, any> = Record<string, any>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly _listeners = new Map<string, Set<(event: any) => void>>();

  on<K extends keyof TMap & string>(event: K, listener: (event: TMap[K]) => void): void;
  on(event: string, listener: (event: any) => void): void;
  on(event: string, listener: (event: any) => void): void {
    let set = this._listeners.get(event);
    if (!set) {
      set = new Set();
      this._listeners.set(event, set);
    }
    set.add(listener);
  }

  off<K extends keyof TMap & string>(event: K, listener: (event: TMap[K]) => void): void;
  off(event: string, listener: (event: any) => void): void;
  off(event: string, listener: (event: any) => void): void {
    const set = this._listeners.get(event);
    if (set) {
      set.delete(listener);
      if (set.size === 0) this._listeners.delete(event);
    }
  }

  emit<K extends keyof TMap & string>(event: K, data: TMap[K]): void;
  emit(event: string, data: unknown): void;
  emit(event: string, data: unknown): void {
    const set = this._listeners.get(event);
    if (set) {
      for (const listener of set) listener(data);
    }
  }

  removeAllListeners(): void {
    this._listeners.clear();
  }
}
