import React, { useState, useEffect, useContext, useRef } from 'react';

import { Picker } from '@react-native-picker/picker';

import {
  getHomeScreenDefaultList,
  getHomeScreenHex,
  getDeviceType,
  IDeviceType,
} from '@onekeyfe/hd-core';
import { ResourceType } from '@onekeyfe/hd-transport';
import { Image, Label, Stack, View, XStack } from 'tamagui';
import { Platform } from 'react-native';
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
  const [wallPapers, setWallPapers] = useState([]);
  const [selectWallPaper, setSelectorWallPaper] = useState(wallPapers?.[0]);

  useEffect(() => {
    const fetchWallPapers = async () => {
      const res = await SDK?.getFeatures(selectedDevice?.connectId);
      if (!res?.payload) return;
      if (!res.success) return;
      deviceTypeRef.current = getDeviceType(res?.payload);
      setWallPapers(getHomeScreenDefaultList(res?.payload));
    };
    fetchWallPapers();
  }, [SDK, selectedDevice?.connectId]);

  const applyWallPaper = async () => {
    if (!deviceTypeRef?.current) {
      alert('Please select a device');
      return;
    }
    if (!selectWallPaper) {
      alert('Please select a wallpaper');
      return;
    }

    await SDK?.deviceSettings(selectedDevice?.connectId ?? '', {
      homescreen: getHomeScreenHex(deviceTypeRef.current, selectWallPaper),
      ...commonParams,
    });
  };

  return (
    <PanelView title="Change Device Screen">
      <XStack flexWrap="wrap" gap="$4">
        <Stack width={160} minHeight={45}>
          <Label paddingRight="$0" justifyContent="center">
            {intl.formatMessage({ id: 'label__res_type_wall_paper' })}
          </Label>
          <Picker selectedValue={selectWallPaper} onValueChange={setSelectorWallPaper}>
            {wallPapers.map(item => (
              <Picker.Item key={item} label={item} value={item} />
            ))}
          </Picker>
        </Stack>
        <Button onPress={applyWallPaper}>{intl.formatMessage({ id: 'action__update' })}</Button>
      </XStack>
    </PanelView>
  );
}
