import semver from 'semver';
import {
  ERRORS,
  HardwareError,
  HardwareErrorCode,
  HardwareErrorCodeMessage,
} from '@onekeyfe/hd-shared';

import { serializedPath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { CoreApi } from '../../types';
import type {
  AllNetworkAddressParams,
  INetwork,
  AllNetworkAddress,
  CommonResponseParams,
} from '../../types/api/allNetworkGetAddress';
import { PROTO } from '../../constants';

import { findMethod } from '../utils';
import { createUiMessage, DEVICE, IFRAME } from '../../events';
import { getDeviceFirmwareVersion, getMethodVersionRange } from '../../utils';
import { Device, DeviceEvents } from '../../device/Device';
import { UI_REQUEST } from '../../constants/ui-request';
import { onDeviceButtonHandler } from '../../core';

const Mainnet = 'mainnet';

export type NetworkConfig = {
  methodName: keyof CoreApi;
  getParams?: (baseParams: AllNetworkAddressParams, chainName?: string, methodName?: string) => any;
  dependOnMethodName?: (keyof CoreApi)[];
};

export type INetworkReal = Exclude<INetwork, 'tbtc' | 'bch' | 'doge' | 'ltc' | 'neurai'>;

export type NetworkConfigMap = {
  [K in INetworkReal]: NetworkConfig;
};

export const networkAliases: {
  [key: string]: { name: INetworkReal; coin: string };
} = {
  tbtc: { name: 'btc', coin: 'Testnet' },
  bch: { name: 'btc', coin: 'Bcash' },
  doge: { name: 'btc', coin: 'Dogecoin' },
  ltc: { name: 'btc', coin: 'Litecoin' },
  neurai: { name: 'btc', coin: 'Neurai' },
};

const networkConfigMap: NetworkConfigMap = {
  btc: {
    methodName: 'btcGetPublicKey',
    getParams: (baseParams: AllNetworkAddressParams, chainName?: string) => ({
      coin: chainName,
      ...baseParams,
    }),
  },
  evm: {
    methodName: 'evmGetAddress',
    getParams: (baseParams: AllNetworkAddressParams, chainName?: string) => {
      const { path, showOnOneKey } = baseParams;
      let chainId;
      if (chainName) {
        chainId = parseInt(chainName);
      }
      return {
        chainId,
        path,
        showOnOneKey,
      };
    },
  },
  sol: {
    methodName: 'solGetAddress',
  },
  algo: {
    methodName: 'algoGetAddress',
  },
  near: {
    methodName: 'nearGetAddress',
  },
  stc: {
    methodName: 'starcoinGetAddress',
  },
  cfx: {
    methodName: 'confluxGetAddress',
    getParams: (baseParams: AllNetworkAddressParams, chainName?: string) => {
      const { path, showOnOneKey } = baseParams;
      return {
        chainId: parseInt(chainName ?? '1029'),
        path,
        showOnOneKey,
      };
    },
  },
  tron: {
    methodName: 'tronGetAddress',
  },
  aptos: {
    methodName: 'aptosGetAddress',
  },
  xrp: {
    methodName: 'xrpGetAddress',
  },
  cosmos: {
    methodName: 'cosmosGetPublicKey',
    getParams: (baseParams: AllNetworkAddressParams) => {
      const { path, prefix, showOnOneKey } = baseParams;
      return {
        hrp: prefix,
        path,
        showOnOneKey,
      };
    },
  },
  ada: {
    methodName: 'cardanoGetAddress',
    getParams: (baseParams: AllNetworkAddressParams, chainName?: string) => {
      const { path, showOnOneKey } = baseParams;

      const addressPath =
        typeof path === 'string' ? `${path}/0/0` : serializedPath([...path, 0, 0]);
      const stakingPath =
        typeof path === 'string' ? `${path}/2/0` : serializedPath([...path, 2, 0]);

      let networkId = 1;
      if (chainName) {
        networkId = chainName === Mainnet ? 1 : 0;
      }

      return {
        addressParameters: {
          addressType: PROTO.CardanoAddressType.BASE,
          path: addressPath,
          stakingPath,
        },
        protocolMagic: 764824073,
        networkId,
        derivationType: PROTO.CardanoDerivationType.ICARUS,
        showOnOneKey,
        address: '',
        isCheck: false,
      };
    },
  },
  sui: {
    methodName: 'suiGetAddress',
  },
  benfen: {
    methodName: 'benfenGetAddress',
  },
  fil: {
    methodName: 'filecoinGetAddress',
    getParams: (baseParams: AllNetworkAddressParams, chainName?: string) => {
      const { path, showOnOneKey } = baseParams;
      let isTestnet = false;
      if (chainName) {
        isTestnet = chainName !== Mainnet;
      }
      return {
        isTestnet,
        path,
        showOnOneKey,
      };
    },
  },
  dot: {
    methodName: 'polkadotGetAddress',
    getParams: (baseParams: AllNetworkAddressParams, chainName?: string) => {
      const { path, prefix, showOnOneKey } = baseParams;
      if (!prefix || !chainName) {
        throw new Error('Invalid params');
      }
      return {
        prefix: parseInt(prefix),
        network: chainName,
        path,
        showOnOneKey,
      };
    },
  },
  kaspa: {
    methodName: 'kaspaGetAddress',
    getParams: (baseParams: AllNetworkAddressParams) => {
      const { path, prefix, showOnOneKey, useTweak } = baseParams;
      return {
        scheme: 'schnorr',
        prefix,
        path,
        showOnOneKey,
        useTweak,
      };
    },
  },
  nexa: {
    methodName: 'nexaGetAddress',
    getParams: (baseParams: AllNetworkAddressParams) => {
      const { path, prefix, showOnOneKey } = baseParams;
      return {
        scheme: 'Schnorr',
        prefix,
        path,
        showOnOneKey,
      };
    },
  },
  dynex: {
    methodName: 'dnxGetAddress',
  },
  nervos: {
    methodName: 'nervosGetAddress',
    getParams: (baseParams: AllNetworkAddressParams, chainName?: string) => {
      const { path, showOnOneKey } = baseParams;
      return {
        network: chainName,
        path,
        showOnOneKey,
      };
    },
  },
  scdo: {
    methodName: 'scdoGetAddress',
  },
  ton: {
    methodName: 'tonGetAddress',
  },
  alph: {
    methodName: 'alephiumGetAddress',
  },
  nostr: {
    methodName: 'nostrGetPublicKey',
  },
  neo: {
    methodName: 'neoGetAddress',
  },
};

type MethodParams = {
  methodName: keyof CoreApi;
  params: Parameters<CoreApi[keyof CoreApi]>[0];
  _originRequestParams: AllNetworkAddressParams;
  _originalIndex: number;
};

export default abstract class AllNetworkGetAddressBase extends BaseMethod<
  {
    address_n: number[];
    show_display: boolean;
    network: string;
    chain_name?: string;
  }[]
> {
  abortController: AbortController | null = null;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    // check payload
    validateParams(this.payload, [{ name: 'bundle', type: 'array' }]);

    // check bundle
    this.payload?.bundle?.forEach((batch: AllNetworkAddressParams) => {
      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'network', type: 'string', required: true },
        { name: 'chainName', type: 'string' },
        { name: 'showOnOneKey', type: 'boolean' },
      ]);
    });
  }

  generateMethodName({
    network,
    payload,
    originalIndex,
  }: {
    network: INetwork;
    payload: AllNetworkAddressParams;
    originalIndex: number;
  }): MethodParams {
    const { name: networkName, coin } = networkAliases[network] || {
      name: network,
      coin: payload?.chainName,
    };
    const config = networkConfigMap[networkName];
    if (!config) {
      throw new Error(`Unsupported network: ${network}`);
    }

    return {
      methodName: config.methodName,
      params: {
        ...(config?.getParams?.(payload, coin, config.methodName) ?? payload),
        originPayload: payload,
      },
      _originRequestParams: payload,
      _originalIndex: originalIndex,
    };
  }

  async callMethod(
    methodName: keyof CoreApi,
    params: any & {
      bundle: (any & { _originRequestParams: CommonResponseParams })[];
    }
  ) {
    const method: BaseMethod = findMethod({
      event: IFRAME.CALL,
      type: IFRAME.CALL,
      payload: {
        connectId: this.payload.connectId,
        deviceId: this.payload.deviceId,
        method: methodName,
        ...params,
      },
    });

    method.connector = this.connector;
    method.postMessage = this.postMessage;

    let result: AllNetworkAddress[];
    try {
      method.init();
      method.setDevice?.(this.device);
      method.context = this.context;

      const onSignalAbort = () => {
        console.log('=====>>>>> onSignalAbort');
        this.abortController?.abort(HardwareErrorCodeMessage[HardwareErrorCode.RepeatUnlocking]);
      };

      const _onDeviceButtonHandler = (...[device, request]: [...DeviceEvents['button']]) => {
        if (
          request.code === 'ButtonRequest_PinEntry' ||
          request.code === 'ButtonRequest_AttachPin'
        ) {
          onSignalAbort();
        } else {
          onDeviceButtonHandler(device, request);
        }
      };

      // pro pin event
      this.device.on(DEVICE.BUTTON, _onDeviceButtonHandler);
      // classic pin event
      this.device.on(DEVICE.PIN, onSignalAbort);
      this.device.on(DEVICE.PASSPHRASE, onSignalAbort);

      preCheckDeviceSupport(this.device, method);

      const response = await method.run();

      if (!Array.isArray(response) || response.length === 0) {
        throw new Error('No response');
      }

      result = response.map((item, index) => ({
        ...params.bundle[index]._originRequestParams,
        success: true,
        payload: item,
      }));
    } catch (e: any) {
      const error = handleSkippableHardwareError(e, this.device, method);

      if (error) {
        result = params.bundle.map((item: { _originRequestParams: any }) => ({
          ...item._originRequestParams,
          success: false,
          payload: {
            error: error.message,
            code: error.errorCode,
            params: error.params,
            connectId: method.connectId,
            deviceId: method.deviceId,
          },
        }));
      } else {
        throw e;
      }
    }

    return result;
  }

  abstract getAllNetworkAddress(): Promise<AllNetworkAddress[]>;

  async run() {
    if (!this.device.features?.unlocked) {
      // unlock device
      const features = await this.device.unlockDevice();
      if (features.passphrase_protection) {
        // check passphrase state
        await this.device.checkPassphraseStateSafety();
      }
      this.postMessage(createUiMessage(UI_REQUEST.CLOSE_UI_PIN_WINDOW));
    }

    this.abortController = new AbortController();

    return this.getAllNetworkAddress().catch(e => {
      if (e instanceof HardwareError && e.errorCode === HardwareErrorCode.RepeatUnlocking) {
        throw ERRORS.TypedError(HardwareErrorCode.RepeatUnlocking, e.message);
      }
      throw e;
    });
  }
}

/**
 * @experiment Check if the device supports the method
 * @param device
 * @param method BaseMethod
 */
function preCheckDeviceSupport(device: Device, method: BaseMethod) {
  const versionRange = getMethodVersionRange(
    device.features,
    type => method.getVersionRange()[type]
  );
  const currentVersion = getDeviceFirmwareVersion(device.features).join('.');

  if (
    versionRange &&
    semver.valid(versionRange.min) &&
    semver.lt(currentVersion, versionRange.min)
  ) {
    throw ERRORS.createNeedUpgradeFirmwareHardwareError(currentVersion, versionRange.min);
  } else if (method.strictCheckDeviceSupport && !versionRange) {
    throw ERRORS.TypedError(HardwareErrorCode.DeviceNotSupportMethod);
  }
}

function handleSkippableHardwareError(
  e: any,
  device: Device,
  method: BaseMethod
): HardwareError | undefined {
  let error: HardwareError | undefined;

  if (e instanceof HardwareError && e.errorCode !== HardwareErrorCode.RuntimeError) {
    const { errorCode } = e;
    if (errorCode === HardwareErrorCode.CallMethodNeedUpgradeFirmware) {
      error = e;
    } else if (errorCode === HardwareErrorCode.DeviceNotSupportMethod) {
      error = e;
    }
  } else if (e.message?.includes('Failure_UnexpectedMessage')) {
    const versionRange = getMethodVersionRange(
      device.features,
      type => method.getVersionRange()[type]
    );
    const currentVersion = getDeviceFirmwareVersion(device.features).join('.');

    if (
      versionRange &&
      semver.valid(versionRange.min) &&
      semver.lt(currentVersion, versionRange.min)
    ) {
      error = ERRORS.createNeedUpgradeFirmwareHardwareError(currentVersion, versionRange.min);
    } else {
      error = ERRORS.TypedError(HardwareErrorCode.DeviceNotSupportMethod, e.message);
    }
  } else if (
    e.message?.toLowerCase()?.includes('forbidden key path') ||
    e.message?.toLowerCase()?.includes('invalid path')
  ) {
    error = ERRORS.TypedError(HardwareErrorCode.CallMethodInvalidParameter, e.message);
  }

  return error;
}
