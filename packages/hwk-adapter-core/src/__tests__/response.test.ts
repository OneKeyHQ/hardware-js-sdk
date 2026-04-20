import { describe, it, expect } from 'vitest';
import { success, failure, HardwareErrorCode } from '../index';
import type { Response } from '../index';

describe('response helpers', () => {
  describe('success()', () => {
    it('should create a success response with the given payload', () => {
      const result = success({ address: '0x123', path: "m/44'/60'/0'/0/0" });

      expect(result.success).toBe(true);
      expect(result.payload).toEqual({ address: '0x123', path: "m/44'/60'/0'/0/0" });
    });
  });

  describe('failure()', () => {
    it('should create a failure response with error code and message', () => {
      const result = failure(HardwareErrorCode.DeviceNotFound, 'No device detected');

      expect(result.success).toBe(false);
      expect(result.payload.code).toBe(HardwareErrorCode.DeviceNotFound);
      expect(result.payload.error).toBe('No device detected');
    });

    it('should create a failure response for user rejection', () => {
      const result = failure(HardwareErrorCode.UserRejected, 'User cancelled the operation');

      expect(result.success).toBe(false);
      expect(result.payload.code).toBe(3);
      expect(result.payload.error).toBe('User cancelled the operation');
    });
  });

  describe('Response<T> type narrowing', () => {
    it('should narrow success response type correctly', () => {
      const result: Response<string> = success('test');

      if (result.success) {
        expect(result.payload).toBe('test');
      } else {
        expect.unreachable('Should be a success response');
      }
    });

    it('should narrow failure response type correctly', () => {
      const result: Response<string> = failure(
        HardwareErrorCode.UnknownError,
        'Something went wrong'
      );

      if (!result.success) {
        expect(result.payload.code).toBe(0);
        expect(result.payload.error).toBe('Something went wrong');
      } else {
        expect.unreachable('Should be a failure response');
      }
    });
  });
});
