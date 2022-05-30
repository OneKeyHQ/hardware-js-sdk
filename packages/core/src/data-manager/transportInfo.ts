import semver from 'semver'

export interface BridgeInfo {
  version: number[];
  changelog_cn: string,
  changelog_en: string
}

const info: BridgeInfo = {
  version: [],
  changelog_cn: '',
  changelog_en: ''
};

// Parse JSON loaded from config.assets.bridge
export const parseBridgeJSON = (versionInfo: any) => {
  const {major, minor, patch} = semver.parse(versionInfo.version) ?? {}
  const version = [major, minor, patch]
  info.version = version as number[]
  info.changelog_cn = versionInfo.changelog_cn
  info.changelog_en = versionInfo.changelog_en
  return info;
};

export const getBridgeInfo = (): BridgeInfo => info;
