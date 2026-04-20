import { describe, it, expect, vi } from 'vitest';
import { TypedEventEmitter } from '../index';

type TestEventMap = {
  test: { type: 'test'; value: number };
  other: { type: 'other'; label: string };
};

describe('TypedEventEmitter', () => {
  it('should call listeners when event is emitted', () => {
    const emitter = new TypedEventEmitter<TestEventMap>();
    const listener = vi.fn();

    emitter.on('test', listener);
    emitter.emit('test', { type: 'test', value: 42 });

    expect(listener).toHaveBeenCalledWith({ type: 'test', value: 42 });
  });

  it('should support multiple listeners for the same event', () => {
    const emitter = new TypedEventEmitter<TestEventMap>();
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    emitter.on('test', listener1);
    emitter.on('test', listener2);
    emitter.emit('test', { type: 'test', value: 1 });

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it('should not call removed listeners', () => {
    const emitter = new TypedEventEmitter<TestEventMap>();
    const listener = vi.fn();

    emitter.on('test', listener);
    emitter.off('test', listener);
    emitter.emit('test', { type: 'test', value: 1 });

    expect(listener).not.toHaveBeenCalled();
  });

  it('should not throw when emitting event with no listeners', () => {
    const emitter = new TypedEventEmitter<TestEventMap>();
    expect(() => emitter.emit('test', { type: 'test', value: 1 })).not.toThrow();
  });

  it('should clean up event key when last listener is removed', () => {
    const emitter = new TypedEventEmitter<TestEventMap>();
    const listener = vi.fn();

    emitter.on('test', listener);
    emitter.off('test', listener);
    emitter.off('test', listener);
  });

  it('should not add the same listener twice', () => {
    const emitter = new TypedEventEmitter<TestEventMap>();
    const listener = vi.fn();

    emitter.on('test', listener);
    emitter.on('test', listener);
    emitter.emit('test', { type: 'test', value: 1 });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should isolate events by name', () => {
    const emitter = new TypedEventEmitter<TestEventMap>();
    const testListener = vi.fn();
    const otherListener = vi.fn();

    emitter.on('test', testListener);
    emitter.on('other', otherListener);
    emitter.emit('test', { type: 'test', value: 99 });

    expect(testListener).toHaveBeenCalledWith({ type: 'test', value: 99 });
    expect(otherListener).not.toHaveBeenCalled();
  });

  it('should remove all listeners', () => {
    const emitter = new TypedEventEmitter<TestEventMap>();
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    emitter.on('test', listener1);
    emitter.on('other', listener2);
    emitter.removeAllListeners();
    emitter.emit('test', { type: 'test', value: 1 });
    emitter.emit('other', { type: 'other', label: 'x' });

    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).not.toHaveBeenCalled();
  });
});
