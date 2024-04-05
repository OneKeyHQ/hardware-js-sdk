import { URDecoder } from '@onekeyfe/hd-air-gap-sdk';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera/next';
import { useCallback, useRef, useState } from 'react';

import { Stack, Text } from 'tamagui';
import { TouchableOpacity } from 'react-native';
import { Button } from '../components/ui/Button';

export default function Scan({ navigation, route }: { navigation: any; route: any }) {
  const [type, setType] = useState<CameraType>('back');
  const [urDecoder] = useState(new URDecoder());
  const [permission, requestPermission] = useCameraPermissions();
  const canGoback = useRef(false);

  const onScanComplete = route.params?.onScanComplete;

  const onQrcodeScan = useCallback(
    (data: string) => {
      try {
        if (!data) {
          return;
        }
        urDecoder.receivePart(data);
        console.log(urDecoder.estimatedPercentComplete());
        if (urDecoder.isComplete()) {
          const result = urDecoder.resultUR();
          if (onScanComplete) {
            onScanComplete({
              type: result.type,
              cbor: result.cbor.toString('hex'),
            });
            if (!canGoback.current) {
              canGoback.current = true;
              navigation.goBack();
            }
          }
        }
      } catch (e) {
        console.log(e);
      }
    },
    [navigation, onScanComplete, urDecoder]
  );

  if (!permission) {
    // Camera permissions are still loading
    return <Stack />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <Stack flex={1}>
        <Text textAlign="center">We need your permission to show the camera</Text>
        <Button onPress={requestPermission}>grant permission"</Button>
      </Stack>
    );
  }

  const toggleCameraType = () => {
    setType(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
    // <Stack flex={1}>
    <CameraView
      style={{ flex: 1 }}
      facing={type}
      onBarcodeScanned={({ data }) => onQrcodeScan(data)}
    >
      <Stack flex={1} gap={16} marginTop={8} marginStart={8} marginEnd={200}>
        <TouchableOpacity onPress={navigation.goBack}>
          <Text fontSize={24}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleCameraType}>
          <Text fontSize={24}>Flip Camera</Text>
        </TouchableOpacity>
      </Stack>
    </CameraView>
    // </Stack>
  );
}
