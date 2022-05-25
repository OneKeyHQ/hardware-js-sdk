import { inject, InjectApi } from './inject';

export { default as Core, init as initCore } from './core';

export * from './constants';
export * from './utils';
export * from './data-manager';
export * from './events';
export * from './types';

const HardwareSdk = ({ init, call, dispose, eventEmitter }: InjectApi) =>
  inject({
    init,
    call,
    dispose,
    eventEmitter,
  });

export default HardwareSdk;
