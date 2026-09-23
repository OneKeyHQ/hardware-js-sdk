import type { SearchDevice } from '../device';
import type { CommonParams, Response } from '../params';

export type SearchDevicesParams = CommonParams & {
  /**
   * Desktop WebUSB recovery only: actively verify Protocol V2 with one wire-level
   * Ping and return the matching descriptor without initializing device state.
   */
  protocolProbeOnly?: boolean;
  /** Timeout in milliseconds for the single Protocol V2 probe-only Ping. */
  protocolProbeTimeoutMs?: number;
};

export declare function searchDevices(params?: SearchDevicesParams): Response<SearchDevice[]>;
