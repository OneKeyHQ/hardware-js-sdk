import semver from 'semver';
import { EDeviceType, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../constants/ui-request';
import {
  PROTOCOL_V2_DEVICE_INFO_REQUEST,
  normalizeProtocolV2Features,
} from '../protocols/protocol-v2';
import { getDeviceType } from '../utils';
import { fixVersion } from '../utils/deviceFeaturesUtils';
import { buildUnifiedDeviceInfo } from './helpers/deviceInfo';
import { BaseMethod } from './BaseMethod';

import type {
  DeviceInfoScope,
  DeviceInfoSource,
  GetDeviceInfoParams,
} from '../types/api/getDeviceInfo';
import type { Features, OnekeyFeatures } from '../types';
import type { ProtocolV2DeviceInfo } from '@onekeyfe/hd-transport';

const DEVICE_INFO_SCOPES: readonly DeviceInfoScope[] = ['basic', 'versions', 'verify', 'full'];

function isDeviceInfoScope(scope: unknown): scope is DeviceInfoScope {
  return typeof scope === 'string' && DEVICE_INFO_SCOPES.includes(scope as DeviceInfoScope);
}

function normalizeScope(scope: unknown): GetDeviceInfoParams['scope'] {
  if (scope === undefined || scope === null) return 'basic';
  if (isDeviceInfoScope(scope)) {
    return scope;
  }
  throw ERRORS.TypedError(
    HardwareErrorCode.CallMethodInvalidParameter,
    `Invalid getDeviceInfo scope: ${String(scope)}`
  );
}

function shouldReadProtocolV2DeviceInfo(params: GetDeviceInfoParams) {
  return (
    params.refresh === true ||
    params.includeRaw === true ||
    params.scope === 'verify' ||
    params.scope === 'full'
  );
}

function shouldReadOnekeyFeatures(params: GetDeviceInfoParams) {
  return (
    params.includeRaw === true ||
    params.scope === 'versions' ||
    params.scope === 'verify' ||
    params.scope === 'full'
  );
}

function supportOnekeyFeatures(features?: Features) {
  if (!features || features.bootloader_mode) return false;

  const deviceType = getDeviceType(features);
  return ![
    EDeviceType.Unknown,
    EDeviceType.Classic1s,
    EDeviceType.ClassicPure,
    EDeviceType.Pro2,
  ].includes(deviceType);
}

function normalizeOnekeyFeatures(message: OnekeyFeatures) {
  if (message.onekey_firmware_version && !semver.valid(message.onekey_firmware_version)) {
    message.onekey_firmware_version = fixVersion(message.onekey_firmware_version);
  }
  return message;
}

export default class GetDeviceInfo extends BaseMethod<GetDeviceInfoParams> {
  init() {
    this.allowDeviceMode = [
      ...this.allowDeviceMode,
      UI_REQUEST.NOT_INITIALIZE,
      UI_REQUEST.BOOTLOADER,
    ];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = {
      scope: normalizeScope(this.payload.scope),
      refresh: this.payload.refresh,
      includeRaw: this.payload.includeRaw,
    };
  }

  async run() {
    if (this.device.originalDescriptor?.protocolType === 'V2') {
      return this.runProtocolV2();
    }
    return this.runProtocolV1();
  }

  private async runProtocolV2() {
    const sources: DeviceInfoSource[] = ['features'];
    let { features } = this.device;
    let protocolV2DeviceInfo: ProtocolV2DeviceInfo | undefined;

    if (shouldReadProtocolV2DeviceInfo(this.params)) {
      const { message } = await this.device.commands.typedCall(
        'DeviceGetDeviceInfo',
        'DeviceInfo',
        PROTOCOL_V2_DEVICE_INFO_REQUEST
      );
      protocolV2DeviceInfo = message as unknown as ProtocolV2DeviceInfo;
      features = normalizeProtocolV2Features(this.device.originalDescriptor, protocolV2DeviceInfo);
      this.device._updateFeatures(features);
      sources.push('deviceGetDeviceInfo');
    }

    return buildUnifiedDeviceInfo({
      protocol: 'V2',
      features,
      protocolV2DeviceInfo,
      sources,
      scope: this.params.scope,
      includeRaw: this.params.includeRaw,
    });
  }

  private async runProtocolV1() {
    if (this.params.refresh === true) {
      await this.device.getFeatures();
    }

    const sources: DeviceInfoSource[] = ['features'];
    const { features } = this.device;
    let onekeyFeatures: OnekeyFeatures | undefined;

    if (shouldReadOnekeyFeatures(this.params) && supportOnekeyFeatures(features)) {
      const { message } = await this.device.commands.typedCall(
        'OnekeyGetFeatures',
        'OnekeyFeatures'
      );
      onekeyFeatures = normalizeOnekeyFeatures(message);
      sources.push('onekeyFeatures');
    }

    return buildUnifiedDeviceInfo({
      protocol: 'V1',
      features,
      onekeyFeatures,
      sources,
      scope: this.params.scope,
      includeRaw: this.params.includeRaw,
    });
  }
}
