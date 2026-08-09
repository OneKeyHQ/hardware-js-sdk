import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import type { FirmwareUpdateHostBinding } from '../../types/api/firmwareUpdate';

const bindingError = (message: string): never => {
  throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, message, {
    firmwareUpdateCode: 'FirmwareArtifactReaderInvalid',
  });
};

class FirmwareHostBindingRegistry {
  private generation = 0;

  private binding?: FirmwareUpdateHostBinding;

  register(binding: FirmwareUpdateHostBinding): number {
    if (
      !binding ||
      typeof binding.preparedPlanDigest !== 'string' ||
      !/^[0-9a-f]{64}$/i.test(binding.preparedPlanDigest) ||
      typeof binding.artifactReader?.open !== 'function' ||
      typeof binding.artifactReader.read !== 'function' ||
      typeof binding.artifactReader.close !== 'function'
    ) {
      return bindingError('Firmware host binding is invalid');
    }
    this.generation += 1;
    this.binding = binding;
    return this.generation;
  }

  unregister(generation?: number): boolean {
    if (generation !== undefined && generation !== this.generation) {
      return false;
    }
    this.generation += 1;
    this.binding = undefined;
    return true;
  }

  getGeneration(): number {
    return this.generation;
  }

  resolve(generation: number, preparedPlanDigest?: string): FirmwareUpdateHostBinding {
    if (
      !Number.isSafeInteger(generation) ||
      generation <= 0 ||
      generation !== this.generation ||
      !this.binding
    ) {
      return bindingError(`Firmware host binding generation ${generation} is stale`);
    }
    const { binding } = this;
    if (
      preparedPlanDigest !== undefined &&
      binding.preparedPlanDigest.toLowerCase() !== preparedPlanDigest.toLowerCase()
    ) {
      return bindingError(
        `Firmware host binding generation ${generation} does not match the prepared plan`
      );
    }
    const assertCurrent = () => {
      if (generation !== this.generation || binding !== this.binding) {
        bindingError(`Firmware host binding generation ${generation} is stale`);
      }
    };
    return {
      preparedPlanDigest: binding.preparedPlanDigest,
      artifactReader: {
        open: async input => {
          assertCurrent();
          const opened = await binding.artifactReader.open(input);
          try {
            assertCurrent();
          } catch (error) {
            if (opened?.readerId) {
              await binding.artifactReader
                .close({ readerId: opened.readerId })
                .catch(() => undefined);
            }
            throw error;
          }
          return opened;
        },
        read: async input => {
          assertCurrent();
          const result = await binding.artifactReader.read(input);
          assertCurrent();
          return result;
        },
        close: input => binding.artifactReader.close(input),
      },
    };
  }
}

const firmwareHostBindingRegistry = new FirmwareHostBindingRegistry();

export const registerFirmwareUpdateHostBinding = (binding: FirmwareUpdateHostBinding): number =>
  firmwareHostBindingRegistry.register(binding);

export const unregisterFirmwareUpdateHostBinding = (generation?: number): boolean =>
  firmwareHostBindingRegistry.unregister(generation);

export const getFirmwareUpdateHostBindingGeneration = (): number =>
  firmwareHostBindingRegistry.getGeneration();

export const resolveFirmwareUpdateHostBinding = (
  generation: number | undefined,
  preparedPlanDigest?: string
): FirmwareUpdateHostBinding =>
  firmwareHostBindingRegistry.resolve(generation ?? Number.NaN, preparedPlanDigest);
