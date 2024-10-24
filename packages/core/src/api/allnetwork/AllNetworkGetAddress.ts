import semver from 'semver';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { get } from 'lodash';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { CoreApi } from '../../types';

import type {
  AllNetworkAddress,
  AllNetworkAddressParams,
  CommonResponseParams,
  INetwork,
} from '../../types/api/allNetworkGetAddress';
import { findMethod } from '../utils';
import { IFRAME } from '../../events';
import { getDeviceFirmwareVersion, getMethodVersionRange } from '../../utils';
import { Device } from '../../device/Device';
import { PROTO } from '../../constants';

const Mainnet = 'mainnet';

type NetworkConfig = {
  methodName: keyof CoreApi;
  getParams?: (baseParams: AllNetworkAddressParams, chainName?: string, methodName?: string) => any;
  dependOnMethodName?: (keyof CoreApi)[];
};

type INetworkReal = Exclude<INetwork, 'tbtc' | 'bch' | 'doge' | 'ltc' | 'neurai'>;

type NetworkConfigMap = {
  [K in INetworkReal]: NetworkConfig;
};

const networkAliases: {
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
    dependOnMethodName: ['suiGetPublicKey'],
    getParams: (baseParams: AllNetworkAddressParams) => {
      const { path, showOnOneKey } = baseParams;
      return {
        path,
        showOnOneKey,
      };
    },
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
      const { path, prefix, showOnOneKey } = baseParams;
      return {
        scheme: 'schnorr',
        prefix,
        path,
        showOnOneKey,
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
};

export default class AllNetworkGetAddress extends BaseMethod<
  {
    address_n: number[];
    show_display: boolean;
    network: string;
    chain_name?: string;
  }[]
> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    // check payload
    validateParams(this.payload, [{ name: 'bundle', type: 'array' }]);

    // check bundle
    this.payload.bundle.forEach((batch: AllNetworkAddressParams) => {
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
  }: {
    network: INetwork;
    payload: AllNetworkAddressParams;
  }): {
    methodName: keyof CoreApi;
    params: Parameters<CoreApi[keyof CoreApi]>[0] & { originPayload: AllNetworkAddressParams };
    dependOnMethods:
      | {
          methodName: keyof CoreApi;
          params: Parameters<CoreApi[keyof CoreApi]>[0];
        }[]
      | undefined;
  } {
    const { name: networkName, coin } = networkAliases[network] || {
      name: network,
      coin: payload?.chainName,
    };
    const config = networkConfigMap[networkName];
    if (!config) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const dependOnMethods = config.dependOnMethodName?.map(dependOnMethodName => ({
      methodName: dependOnMethodName,
      params: config?.getParams?.(payload, coin, dependOnMethodName),
    }));

    return {
      methodName: config.methodName,
      params: {
        ...(config?.getParams?.(payload, coin, config.methodName) ?? payload),
        originPayload: payload,
      },
      dependOnMethods,
    };
  }

  async callMethod(methodName: keyof CoreApi, params: any, baseParams: CommonResponseParams) {
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
    method.init();
    method.setDevice?.(this.device);

    let result: AllNetworkAddress;
    try {
      const response = await method.run();
      result = {
        ...baseParams,
        success: true,
        error: response.error,
        payload: response,
      };
    } catch (e: any) {
      const errorMessage =
        e instanceof Error ? handleHardwareError(e, this.device, method) : 'Unknown error';

      result = {
        ...baseParams,
        success: false,
        error: errorMessage,
      };
    }

    return result;
  }

  async run() {
    const responses: AllNetworkAddress[] = [];
    for (let i = 0; i < this.payload.bundle.length; i++) {
      const param = this.payload.bundle[i];
      const { methodName, params, dependOnMethods } = this.generateMethodName({
        network: param.network as INetwork,
        payload: param,
      });

      // run depend on methods
      const dependOnMethodResults: AllNetworkAddress[] = [];
      for (const dependOnMethod of dependOnMethods ?? []) {
        const response = await this.callMethod(
          dependOnMethod.methodName,
          dependOnMethod.params,
          param
        );
        dependOnMethodResults.push(response);
      }

      // if any depend on method failed, return the error
      if (dependOnMethodResults.some(result => !result.success)) {
        responses.push({
          ...param,
          success: false,
          error: dependOnMethodResults.find(result => !result.success)?.error,
        });
        return Promise.resolve(responses);
      }

      // call method
      const response = await this.callMethod(methodName, params, param);

      const dependOnPayloads = dependOnMethodResults.reduce(
        (acc, cur) => Object.assign(acc, get(cur, 'payload', {})),
        {}
      );

      const result: AllNetworkAddress = {
        ...response,
        // @ts-expect-error
        payload: { ...response.payload, ...dependOnPayloads },
      };
      responses.push(result);
      this.postPreviousAddressMessage(result);
    }

    return Promise.resolve(responses);
  }
}

function handleHardwareError(e: any, device: Device, method: BaseMethod) {
  let message = e?.message || '';

  if (message.includes('Failure_UnexpectedMessage')) {
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
      message = ERRORS.TypedError(
        HardwareErrorCode.CallMethodNeedUpgradeFirmware,
        `Device firmware version is too low, please update to ${versionRange.min}`,
        { current: currentVersion, require: versionRange.min }
      ).message;
    }
  }

  return message;
}
