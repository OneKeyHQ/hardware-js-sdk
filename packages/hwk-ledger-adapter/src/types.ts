import type {
  DeviceManagementKit,
  DiscoveredDevice,
  DeviceActionState as DmkDeviceActionState,
  ExecuteDeviceActionReturnType,
} from '@ledgerhq/device-management-kit';
import type {
  Address as EthAddress,
  Signature as EthSignature,
} from '@ledgerhq/device-signer-kit-ethereum';

/**
 * Re-export DMK types under local aliases for backward compatibility.
 * These replace the previous duck-typed interfaces with the real SDK types.
 */
export type DmkDiscoveredDevice = DiscoveredDevice;

/**
 * DMK DeviceAction — the Observable-based return type of all DMK signer methods.
 *
 * This is a permissive alias for `ExecuteDeviceActionReturnType` that accepts
 * any Error and IntermediateValue generics. Signer wrapper code only cares about
 * the Output type and the observable/cancel shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DeviceAction<T> = ExecuteDeviceActionReturnType<T, any, any>;

/**
 * DMK DeviceActionState — re-exported with permissive Error/IntermediateValue.
 * The real type is a discriminated union on `status`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DeviceActionState<T> = DmkDeviceActionState<T, any, any>;

/** ETH address result — re-exported from DMK for backward compatibility. */
export type SignerEvmAddress = EthAddress;

/** ETH signature result — re-exported from DMK for backward compatibility. */
export type SignerEvmSignature = EthSignature;

/** BTC address result (WalletAddress not exported from DMK top-level). */
export interface SignerBtcAddress {
  address: string;
}

export interface TransportProviderOptions {
  logger?: unknown;
}

export interface TransportProviderInstance {
  dmk: DeviceManagementKit;
  dispose?: () => Promise<void>;
}

export interface TransportProvider {
  create(options?: TransportProviderOptions): TransportProviderInstance;
}
