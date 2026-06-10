import semver from 'semver';
import { EDeviceType, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../constants/ui-request';
import {
  PROTOCOL_V2_DEVICE_INFO_REQUEST,
  PROTOCOL_V2_FEATURES_DEVICE_INFO_REQUEST,
  PROTOCOL_V2_VERSIONS_DEVICE_INFO_REQUEST,
} from '../protocols/protocol-v2';
import { requestProtocolV2DeviceInfo } from '../protocols/protocol-v2/features';
import { buildProfileFromProtocolV1, buildProfileFromProtocolV2 } from '../deviceProfile';
import { getDeviceType } from '../utils';
import { fixVersion } from '../utils/deviceFeaturesUtils';
import { BaseMethod } from './BaseMethod';

import type {
  DeviceInfoScope,
  DeviceInfoSource,
  GetDeviceInfoParams,
} from '../types/api/getDeviceInfo';
import type { Features, OnekeyFeatures } from '../types';

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

function resolveProtocolV2DeviceInfoRequest(params: GetDeviceInfoParams) {
  if (params.scope === 'verify' || params.scope === 'full') {
    return PROTOCOL_V2_DEVICE_INFO_REQUEST;
  }
  if (params.scope === 'versions') {
    return PROTOCOL_V2_VERSIONS_DEVICE_INFO_REQUEST;
  }
  return PROTOCOL_V2_FEATURES_DEVICE_INFO_REQUEST;
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
    if (this.device.isProtocolV2()) {
      return this.runProtocolV2();
    }
    return this.runProtocolV1();
  }

  private async runProtocolV2() {
    const sources: DeviceInfoSource[] = ['deviceInfo'];
    const protocolV2DeviceInfo = await requestProtocolV2DeviceInfo({
      commands: this.device.commands,
      request: resolveProtocolV2DeviceInfoRequest(this.params),
    });
    const profile = buildProfileFromProtocolV2({
      deviceInfo: protocolV2DeviceInfo,
      sources,
      scope: this.params.scope,
      includeRaw: this.params.includeRaw,
    });
    // 缓存走字段级合并：basic 请求不能降级已有的完整 profile；返回值仍按请求 scope 给出
    if (typeof this.device.applyProfileUpdate === 'function') {
      this.device.applyProfileUpdate(profile);
    } else {
      this.device.updateProfile?.(profile);
    }
    return profile;
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

    const profile = buildProfileFromProtocolV1({
      protocol: 'V1',
      features,
      onekeyFeatures,
      sources,
      scope: this.params.scope,
      includeRaw: this.params.includeRaw,
    });
    this.device.updateProfile?.(profile);
    return profile;
  }
}
