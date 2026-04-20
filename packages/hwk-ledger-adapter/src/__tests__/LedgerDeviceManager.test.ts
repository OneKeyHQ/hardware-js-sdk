import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceModelId, type DeviceManagementKit } from '@ledgerhq/device-management-kit';
import { LedgerDeviceManager } from '../device/LedgerDeviceManager';
import type { DmkDiscoveredDevice } from '../types';

function createMockDmk(): DeviceManagementKit & {
  _emitDevice: (d: DmkDiscoveredDevice) => void;
  _emitList: (d: DmkDiscoveredDevice[]) => void;
} {
  let deviceObserver: any = null;
  let listObserver: any = null;

  return {
    startDiscovering: vi.fn().mockReturnValue({
      subscribe: (obs: any) => {
        deviceObserver = obs;
        return {
          unsubscribe: () => {
            deviceObserver = null;
          },
        };
      },
    }),
    stopDiscovering: vi.fn(),
    listenToAvailableDevices: vi.fn().mockReturnValue({
      subscribe: (obs: any) => {
        listObserver = obs;
        return {
          unsubscribe: () => {
            listObserver = null;
          },
        };
      },
    }),
    connect: vi.fn().mockResolvedValue('session-abc'),
    disconnect: vi.fn().mockResolvedValue(undefined),
    sendCommand: vi.fn().mockResolvedValue({}),
    sendApdu: vi
      .fn()
      .mockResolvedValue({ statusCode: new Uint8Array([0x90, 0x00]), data: new Uint8Array() }),
    close: vi.fn(),
    _emitDevice: (d: DmkDiscoveredDevice) => deviceObserver?.next(d),
    _emitList: (d: DmkDiscoveredDevice[]) => listObserver?.next(d),
  };
}

const DEVICE_1: DmkDiscoveredDevice = {
  id: 'dev-1',
  name: 'Nano X',
  deviceModel: { id: 'dev-1', model: DeviceModelId.NANO_X, name: 'Nano X' },
  transport: 'WebHID',
};
const DEVICE_2: DmkDiscoveredDevice = {
  id: 'dev-2',
  name: 'Nano S',
  deviceModel: { id: 'dev-2', model: DeviceModelId.NANO_S, name: 'Nano S' },
  transport: 'WebHID',
};

describe('LedgerDeviceManager', () => {
  let dmk: ReturnType<typeof createMockDmk>;
  let manager: LedgerDeviceManager;

  beforeEach(() => {
    dmk = createMockDmk();
    manager = new LedgerDeviceManager(dmk);
  });

  describe('enumerate', () => {
    it('should return discovered devices as DeviceDescriptors', async () => {
      const promise = manager.enumerate();
      dmk._emitList([DEVICE_1, DEVICE_2]);
      const result = await promise;
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ path: 'dev-1', type: 'nanoX' }));
      expect(result[1]).toEqual(expect.objectContaining({ path: 'dev-2', type: 'nanoS' }));
    });
  });

  describe('connect / disconnect', () => {
    it('should connect and return sessionId', async () => {
      const p = manager.enumerate();
      dmk._emitList([DEVICE_1]);
      await p;

      const sessionId = await manager.connect('dev-1');
      expect(sessionId).toBe('session-abc');
      expect(dmk.connect).toHaveBeenCalledWith({ device: DEVICE_1 });
    });

    it('should throw if device not discovered', async () => {
      await expect(manager.connect('unknown')).rejects.toThrow('not found');
    });

    it('should disconnect and clear session', async () => {
      const p = manager.enumerate();
      dmk._emitList([DEVICE_1]);
      await p;
      await manager.connect('dev-1');

      await manager.disconnect('session-abc');
      expect(dmk.disconnect).toHaveBeenCalledWith({ sessionId: 'session-abc' });
      expect(manager.getSessionId('dev-1')).toBeUndefined();
    });
  });

  describe('session tracking', () => {
    it('should track deviceId → sessionId', async () => {
      const p = manager.enumerate();
      dmk._emitList([DEVICE_1]);
      await p;
      await manager.connect('dev-1');
      expect(manager.getSessionId('dev-1')).toBe('session-abc');
    });

    it('should track sessionId → deviceId', async () => {
      const p = manager.enumerate();
      dmk._emitList([DEVICE_1]);
      await p;
      await manager.connect('dev-1');
      expect(manager.getDeviceId('session-abc')).toBe('dev-1');
    });
  });

  describe('requestDevice', () => {
    it('should call startDiscovering and resolve after timeout', async () => {
      await manager.requestDevice(50);
      expect(dmk.startDiscovering).toHaveBeenCalled();
    });
  });

  describe('listen', () => {
    it('should emit device-connected for new devices', () => {
      const onChange = vi.fn();
      manager.listen(onChange);
      dmk._emitList([DEVICE_1]);
      expect(onChange).toHaveBeenCalledWith({
        type: 'device-connected',
        descriptor: expect.objectContaining({ path: 'dev-1', type: 'nanoX' }),
      });
    });

    it('should emit device-disconnected when device removed', () => {
      const onChange = vi.fn();
      manager.listen(onChange);
      dmk._emitList([DEVICE_1]);
      onChange.mockClear();
      dmk._emitList([]);
      expect(onChange).toHaveBeenCalledWith({
        type: 'device-disconnected',
        descriptor: { path: 'dev-1' },
      });
    });
  });

  describe('dispose', () => {
    it('should clean up all state', async () => {
      const p = manager.enumerate();
      dmk._emitList([DEVICE_1]);
      await p;
      await manager.connect('dev-1');

      manager.dispose();
      expect(manager.getSessionId('dev-1')).toBeUndefined();
    });
  });

  it('returns the dmk instance via getDmk()', () => {
    expect(manager.getDmk()).toBe(dmk);
  });
});
