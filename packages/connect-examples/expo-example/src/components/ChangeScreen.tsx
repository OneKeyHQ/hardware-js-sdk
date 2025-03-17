import React, { useState, useEffect, useContext, useRef } from 'react';

import { Picker } from '@react-native-picker/picker';

import {
  getHomeScreenDefaultList,
  getHomeScreenHex,
  getDeviceType,
  IDeviceType,
} from '@onekeyfe/hd-core';
import { Label, Stack, XStack } from 'tamagui';
import { useIntl } from 'react-intl';
import HardwareSDKContext from '../provider/HardwareSDKContext';
import { useCommonParams } from '../provider/CommonParamsProvider';
import { useDevice } from '../provider/DeviceProvider';
import PanelView from './ui/Panel';
import { Button } from './ui/Button';

export default function ChangeScreenComponent() {
  const intl = useIntl();
  const { sdk: SDK } = useContext(HardwareSDKContext);
  const { commonParams } = useCommonParams();
  const { selectedDevice } = useDevice();

  const deviceTypeRef = useRef<IDeviceType>();
  const [wallPapers, setWallPapers] = useState<string[]>([]);
  const [selectWallPaper, setSelectorWallPaper] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchWallPapers = async () => {
    if (!SDK || !selectedDevice?.connectId) {
      alert('Please select a device first');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Loading wallpapers...');
      const res = await SDK.getFeatures(selectedDevice.connectId);
      if (!res?.payload) {
        alert('Failed to get device features');
        return;
      }
      if (!res.success) {
        alert('Failed to get device features');
        return;
      }

      deviceTypeRef.current = getDeviceType(res.payload);
      const papers = getHomeScreenDefaultList(res.payload);
      setWallPapers(papers);

      if (papers.length > 0) {
        setSelectorWallPaper(papers[0]);
      }
    } catch (error) {
      console.error('Error fetching wallpapers:', error);
      alert('Error loading wallpapers');
    } finally {
      setIsLoading(false);
    }
  };

  const applyWallPaper = async () => {
    if (!deviceTypeRef?.current) {
      alert('Please load wallpapers first');
      return;
    }
    if (!selectWallPaper) {
      alert('Please select a wallpaper');
      return;
    }

    setIsLoading(true);
    try {
      await SDK?.deviceSettings(selectedDevice?.connectId ?? '', {
        homescreen: getHomeScreenHex(deviceTypeRef.current, selectWallPaper),
        ...commonParams,
      });
      alert('Wallpaper applied successfully');
    } catch (error) {
      console.error('Error applying wallpaper:', error);
      alert('Failed to apply wallpaper');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PanelView title="Change Device Screen">
      <XStack flexWrap="wrap" gap="$4" marginBottom="$4">
        <Button onPress={fetchWallPapers} disabled={isLoading}>
          Load Wallpapers
        </Button>
      </XStack>

      <XStack flexWrap="wrap" gap="$4">
        <Stack width={160} minHeight={45}>
          <Label paddingRight="$0" justifyContent="center">
            {intl.formatMessage({ id: 'label__res_type_wall_paper' })}
          </Label>
          <Picker
            selectedValue={selectWallPaper}
            onValueChange={setSelectorWallPaper}
            enabled={wallPapers.length > 0 && !isLoading}
          >
            {wallPapers.map(item => (
              <Picker.Item key={item} label={item} value={item} />
            ))}
          </Picker>
        </Stack>
        <Button onPress={applyWallPaper} disabled={!selectWallPaper || isLoading}>
          {isLoading ? 'Loading...' : 'Update'}
        </Button>
      </XStack>
    </PanelView>
  );
}
