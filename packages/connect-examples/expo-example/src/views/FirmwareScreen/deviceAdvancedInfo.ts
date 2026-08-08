import type { DeviceState } from '@onekeyfe/hd-core';

export type DeviceAdvancedInfoField = {
  key: string;
  labelId: string;
  value: string | null;
};

export type DeviceAdvancedInfoGroup = {
  key: string;
  titleId: string;
  fields: DeviceAdvancedInfoField[];
};

export type DeviceAdvancedInfo = {
  deviceGroups: DeviceAdvancedInfoGroup[];
  securityElementGroups: DeviceAdvancedInfoGroup[];
};

const text = (value: unknown): string | null => {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
};

const field = (key: string, labelId: string, value: unknown): DeviceAdvancedInfoField => ({
  key,
  labelId,
  value: text(value),
});

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== '';

const componentGroup = ({
  key,
  titleId,
  version,
  buildId,
  hash,
  extraFields = [],
}: {
  key: string;
  titleId: string;
  version: unknown;
  buildId: unknown;
  hash: unknown;
  extraFields?: DeviceAdvancedInfoField[];
}): DeviceAdvancedInfoGroup | undefined => {
  if (![version, buildId, hash, ...extraFields.map(item => item.value)].some(hasValue)) {
    return undefined;
  }

  return {
    key,
    titleId,
    fields: [
      field(`${key}.version`, 'label__device_component_version', version),
      field(`${key}.buildId`, 'label__device_component_build_id', buildId),
      field(`${key}.hash`, 'label__device_component_hash', hash),
      ...extraFields,
    ],
  };
};

const securityElementGroup = (
  state: DeviceState,
  index: 1 | 2 | 3 | 4
): DeviceAdvancedInfoGroup | undefined => {
  const key = `se0${index}` as const;
  const bootKey = `se0${index}Boot` as const;
  const buildIdKey = `se0${index}BuildId` as const;
  const hashKey = `se0${index}Hash` as const;
  const bootBuildIdKey = `se0${index}BootBuildId` as const;
  const bootHashKey = `se0${index}BootHash` as const;
  const metadata = state.securityElements?.[key];
  const values = [
    metadata?.type,
    metadata?.state,
    state.versions[key],
    state.verification?.[buildIdKey],
    state.verification?.[hashKey],
    state.versions[bootKey],
    state.verification?.[bootBuildIdKey],
    state.verification?.[bootHashKey],
  ];

  if (!values.some(hasValue)) return undefined;

  return {
    key,
    titleId: `label__device_component_${key}`,
    fields: [
      field(`${key}.type`, 'label__device_component_type', metadata?.type),
      field(`${key}.state`, 'label__device_component_state', metadata?.state),
      field(`${key}.version`, 'label__device_component_app_version', state.versions[key]),
      field(
        `${key}.buildId`,
        'label__device_component_app_build_id',
        state.verification?.[buildIdKey]
      ),
      field(`${key}.hash`, 'label__device_component_app_hash', state.verification?.[hashKey]),
      field(`${key}.bootVersion`, 'label__device_component_boot_version', state.versions[bootKey]),
      field(
        `${key}.bootBuildId`,
        'label__device_component_boot_build_id',
        state.verification?.[bootBuildIdKey]
      ),
      field(
        `${key}.bootHash`,
        'label__device_component_boot_hash',
        state.verification?.[bootHashKey]
      ),
    ],
  };
};

/**
 * 将 V1/V2 的固件信息收敛为同一组展示字段。页面与导出功能共同消费该模型，
 * 不再依赖 `onekey_*` 兼容字段，也不会为设备不支持的组件渲染空卡片。
 */
export function buildDeviceAdvancedInfo(state: DeviceState): DeviceAdvancedInfo {
  const verification = state.verification ?? {};
  const hasApplicationP1 = [
    state.versions.applicationP1,
    verification.applicationP1BuildId,
    verification.applicationP1Hash,
  ].some(hasValue);

  const deviceGroups: Array<DeviceAdvancedInfoGroup | undefined> = [
    {
      key: 'identity',
      titleId: 'label__device_component_identity',
      fields: [
        field('identity.deviceType', 'label__device_type_sdk', state.identity.deviceType),
        field('identity.serialNo', 'label__device_uuid', state.identity.serialNo),
        field('protocol', 'label__device_protocol', state.protocol),
        field('protocolVersion', 'label__device_protocol_version', state.protocolVersion),
        field('identity.model', 'label__device_model', state.identity.model),
        field('identity.vendor', 'label__device_vendor', state.identity.vendor),
      ],
    },
    componentGroup({
      key: 'board',
      titleId: 'label__device_component_boardloader',
      version: state.versions.board,
      buildId: verification.boardBuildId,
      hash: verification.boardHash,
    }),
    componentGroup({
      key: 'bootloader',
      titleId: 'label__device_component_bootloader',
      version: state.versions.bootloader,
      buildId: verification.bootloaderBuildId,
      hash: verification.bootloaderHash,
    }),
    componentGroup({
      key: hasApplicationP1 ? 'applicationP1' : 'firmware',
      titleId: hasApplicationP1
        ? 'label__device_component_app_p1'
        : 'label__device_component_firmware',
      version: hasApplicationP1 ? state.versions.applicationP1 : state.versions.firmware,
      buildId: hasApplicationP1 ? verification.applicationP1BuildId : verification.firmwareBuildId,
      hash: hasApplicationP1 ? verification.applicationP1Hash : verification.firmwareHash,
    }),
    componentGroup({
      key: 'applicationP2',
      titleId: 'label__device_component_app_p2',
      version: state.versions.applicationP2,
      buildId: verification.applicationP2BuildId,
      hash: verification.applicationP2Hash,
    }),
    componentGroup({
      key: 'ble',
      titleId: 'label__device_component_coprocessor',
      version: state.versions.ble,
      buildId: verification.bleBuildId,
      hash: verification.bleHash,
      extraFields: [field('ble.name', 'label__device_component_ble_name', state.identity.bleName)],
    }),
  ];

  return {
    deviceGroups: deviceGroups.filter(
      (group): group is DeviceAdvancedInfoGroup => group !== undefined
    ),
    securityElementGroups: ([1, 2, 3, 4] as const)
      .map(index => securityElementGroup(state, index))
      .filter((group): group is DeviceAdvancedInfoGroup => group !== undefined),
  };
}
