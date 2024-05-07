import type { CommonParams, Response } from '../params';

export type DnxTrackingKey = {
  path: string;
  trackingKey: string;
};

export type DnxGetTrackingKeyParams = {
  path: string | number[];
};

export declare function dnxGetTrackingKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & DnxGetTrackingKeyParams
): Response<DnxTrackingKey>;
