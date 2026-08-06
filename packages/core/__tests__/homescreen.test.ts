import { EDeviceType } from '@onekeyfe/hd-shared';

import { getHomeScreenSize, getNftSize } from '../src/utils/homescreen';

describe('getHomeScreenSize', () => {
  it('returns the Pro 2 wallpaper dimensions', () => {
    expect(
      getHomeScreenSize({
        deviceType: EDeviceType.Pro2,
        homeScreenType: 'WallPaper',
      })
    ).toEqual({ width: 604, height: 1024 });
  });

  it('does not require a legacy thumbnail for Pro 2 wallpapers', () => {
    expect(
      getHomeScreenSize({
        deviceType: EDeviceType.Pro2,
        homeScreenType: 'WallPaper',
        thumbnail: true,
      })
    ).toBeUndefined();
  });

  it('does not reuse the wallpaper homeScreenType for Pro 2 NFT dimensions', () => {
    expect(
      getHomeScreenSize({
        deviceType: EDeviceType.Pro2,
        homeScreenType: 'Nft',
        thumbnail: false,
      })
    ).toEqual({ width: 604, height: 1024 });
    expect(
      getHomeScreenSize({
        deviceType: EDeviceType.Pro2,
        homeScreenType: 'Nft',
        thumbnail: true,
      })
    ).toBeUndefined();
  });
});

describe('getNftSize', () => {
  it('returns the Pro 2 NFT image and thumbnail dimensions independently', () => {
    expect(getNftSize({ deviceType: EDeviceType.Pro2 })).toEqual({ width: 540, height: 540 });
    expect(getNftSize({ deviceType: EDeviceType.Pro2, thumbnail: true })).toEqual({
      width: 263,
      height: 263,
    });
  });

  it('preserves the legacy NFT dimensions', () => {
    expect(getNftSize({ deviceType: EDeviceType.Touch })).toEqual({ width: 480, height: 800 });
    expect(getNftSize({ deviceType: EDeviceType.Touch, thumbnail: true })).toEqual({
      width: 238,
      height: 238,
    });
    expect(getNftSize({ deviceType: EDeviceType.Pro, thumbnail: true })).toEqual({
      width: 226,
      height: 226,
      radius: 40,
    });
  });
});
