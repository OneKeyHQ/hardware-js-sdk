// Adapter
export { LedgerAdapter } from './adapter/LedgerAdapter';

// Connector base class (used by connector packages)
export { LedgerConnectorBase } from './connector/LedgerConnectorBase';
export type { TransportFactory, LedgerConnectorBaseOptions } from './connector/LedgerConnectorBase';

// Device management (used by connectors)
export { LedgerDeviceManager } from './device/LedgerDeviceManager';

// Signer (used by connectors)
export { SignerManager } from './signer/SignerManager';
export { SignerEth } from './signer/SignerEth';
export { SignerBtc } from './signer/SignerBtc';
export { SignerSol } from './signer/SignerSol';
export { DmkTransport } from './transport/DmkTransport';
export { deviceActionToPromise } from './signer/deviceActionToPromise';

// App management
export { AppManager } from './app/AppManager';

// Types
export type {
  DmkDiscoveredDevice,
  DeviceActionState,
  SignerEvmAddress,
  SignerEvmSignature,
  SignerBtcAddress,
} from './types';

// Errors
export { isDeviceLockedError, ledgerFailure, mapLedgerError } from './errors';
export type { LedgerFailure } from './errors';

// Debug logging (opt-in)
export { setDebugEnabled, isDebugEnabled } from './utils/debugLog';
