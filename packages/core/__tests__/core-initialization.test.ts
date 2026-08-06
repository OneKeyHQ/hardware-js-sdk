import { DataManager } from '../src/data-manager';
import { init } from '../src/core';

import type { ConnectSettings } from '../src/types';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0-test'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0-test/',
}));

describe('Core initialization', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not create a partially initialized core when settings loading fails', async () => {
    jest.spyOn(DataManager, 'load').mockRejectedValue(new Error('settings load failed'));

    await expect(init({} as ConnectSettings, class TestTransport {})).rejects.toThrow(
      'settings load failed'
    );
  });
});
