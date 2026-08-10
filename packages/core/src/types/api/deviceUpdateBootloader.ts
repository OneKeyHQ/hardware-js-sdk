import type { Success } from '@onekeyfe/hd-transport';
import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { FirmwareArtifactReader, FirmwareArtifactReference } from './firmwareUpdate';
import type { FirmwareUpdatePreparedPlan } from './firmwareUpdatePreparedPlan';
import type { Response } from '../params';

export type DeviceUpdateBootloaderParams = {
  preparedPlan?: FirmwareUpdatePreparedPlan;
  hostBindingGeneration?: number;
  binary?: ArrayBuffer;
  /** @deprecated Core derives the bootloader artifact from preparedPlan. */
  artifact?: FirmwareArtifactReference;
  artifactReader?: FirmwareArtifactReader;
  firmwareType?: EFirmwareType;
};

export declare function deviceUpdateBootloader(
  connectId: string,
  params?: DeviceUpdateBootloaderParams
): Response<Success>;
