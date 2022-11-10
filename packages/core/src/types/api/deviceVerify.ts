import type { CommonParams, Response } from '../params';

export type DeviceVerifyParams = {
  dataHex: string;
};

export type DeviceVerifySignature = {
  cert: string;
  signature: string;
};

export declare function deviceVerify(
  connectId: string,
  params: CommonParams & DeviceVerifyParams
): Response<DeviceVerifySignature>;
