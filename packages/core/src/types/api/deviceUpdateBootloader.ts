import type { Success } from '@onekeyfe/hd-transport';
import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type {
  FirmwareArtifactReader,
  FirmwareArtifactReference,
  FirmwareCheckpointParams,
} from './firmwareUpdate';
import type { FirmwareUpdatePreparedPlan } from './firmwareUpdatePreparedPlan';
import type { Response } from '../params';

export type DeviceUpdateBootloaderParams = FirmwareCheckpointParams & {
  preparedPlan?: FirmwareUpdatePreparedPlan;
  binary?: ArrayBuffer;
  artifact?: FirmwareArtifactReference;
  artifactReader?: FirmwareArtifactReader;
  firmwareType?: EFirmwareType;
};

export declare function deviceUpdateBootloader(
  connectId: string,
  params?: DeviceUpdateBootloaderParams
): Response<Success>;
