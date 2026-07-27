import { EDeviceType } from '@onekeyfe/hd-shared';

import { getHomeScreenSize } from '../src/utils/homescreen';

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
});
