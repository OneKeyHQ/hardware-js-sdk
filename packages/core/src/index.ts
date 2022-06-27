import { inject, InjectApi } from './inject';
import { CoreApi } from './types/api';

export { default as Core, init as initCore, cancel as coreCancel } from './core';

export * from './constants';
export * from './utils';
export * from './data-manager';
export * from './events';
export * from './types';

const HardwareSdk = ({
  init,
  call,
  dispose,
  eventEmitter,
  uiResponse,
  cancel,
}: InjectApi): CoreApi =>
  inject({
    init,
    call,
    dispose,
    eventEmitter,
    uiResponse,
    cancel,
  });

export default HardwareSdk;
