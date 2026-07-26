import { FirmwareUpdateErrorCode, createFirmwareUpdateError } from './errors';

import type { FirmwareUpdateHostBinding } from './contracts';

export interface FirmwareHostBindingSnapshot {
  generation: number;
  binding: FirmwareUpdateHostBinding;
}

const invalidReader = (detail: string): never => {
  throw createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwareArtifactReaderInvalid, detail, {
    detail,
  });
};

export class FirmwareHostBindingRegistry {
  private generation = 0;

  private binding: FirmwareUpdateHostBinding | null = null;

  register(binding: FirmwareUpdateHostBinding): number {
    this.generation += 1;
    this.binding = binding;
    return this.generation;
  }

  reset(): number {
    this.generation += 1;
    this.binding = null;
    return this.generation;
  }

  getGeneration(): number {
    return this.generation;
  }

  capture(): FirmwareHostBindingSnapshot {
    if (!this.binding) {
      return invalidReader('Firmware host binding is not registered');
    }
    return {
      generation: this.generation,
      binding: this.binding,
    };
  }

  assertCurrent(generation: number): void {
    if (!this.binding || generation !== this.generation) {
      invalidReader(
        `Firmware host binding generation ${generation} is stale; current generation is ${this.generation}`
      );
    }
  }
}

export const firmwareHostBindingRegistry = new FirmwareHostBindingRegistry();

export const registerFirmwareHostBinding = (binding: FirmwareUpdateHostBinding): number =>
  firmwareHostBindingRegistry.register(binding);

export const unregisterFirmwareHostBinding = (generation?: number): boolean => {
  if (generation !== undefined && generation !== firmwareHostBindingRegistry.getGeneration()) {
    return false;
  }
  firmwareHostBindingRegistry.reset();
  return true;
};

export const getFirmwareHostBindingGeneration = (): number =>
  firmwareHostBindingRegistry.getGeneration();
