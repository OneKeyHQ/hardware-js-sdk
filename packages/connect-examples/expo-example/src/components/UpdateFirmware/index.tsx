import { useContext, useState } from 'react';
import { Switch, Button, Text, StyleSheet, View, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useDevice } from '../../provider/DeviceProvider';
import HardwareSDKContext from '../../provider/HardwareSDKContext';

type FirmwareType = 'firmware' | 'ble';

export default function UpdateFirmware() {
  const { sdk: SDK, type } = useContext(HardwareSDKContext);
  const { selectedDevice } = useDevice();

  const [firmwareType, setFirmwareType] = useState<FirmwareType>('firmware');
  const [selectedFile, setSelectedFile] = useState<Uint8Array>();

  const handleFirmwareUpdate = async (file?: Uint8Array) => {
    const params: any = { updateType: firmwareType };
    if (file) {
      params.binary = file;
    }
    const response = await SDK?.firmwareUpdate(
      type === 'Bluetooth' ? selectedDevice?.connectId : undefined,
      params
    );
    console.log('example firmwareUpdate response: ', response);
  };

  const handleFirmwareUpdateV2 = async () => {
    const params: any = {
      updateType: firmwareType,
      platform: Platform.OS === 'web' ? 'web' : 'native',
      forcedUpdateRes: false,
    };

    if (selectedFile) {
      params.binary = selectedFile;
    }
    const response = await SDK?.firmwareUpdateV2(
      type === 'Bluetooth' ? selectedDevice?.connectId : undefined,
      params
    );
    console.log('example firmwareUpdate response: ', response);
  };

  const onFileChange = (
    e: any,
    callback: (data: Uint8Array, fileType?: string, file?: File) => void
  ) => {
    const file = e.target.files?.[0];
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = function () {
      const arrayBuffer = reader.result;
      const array = new Uint8Array(arrayBuffer as ArrayBuffer);
      callback(array, file.type, file);
    };
  };

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Upload Firmware</Text>
      <View style={{ flexDirection: Platform.OS === 'web' ? 'row' : 'column', flexWrap: 'wrap' }}>
        <View style={styles.item}>
          <Text>升级固件类型</Text>
          <Picker
            selectedValue={firmwareType}
            onValueChange={itemValue => setFirmwareType(itemValue)}
          >
            <Picker.Item label="Firmware" value="firmware" />
            <Picker.Item label="Ble" value="ble" />
          </Picker>
        </View>
        <View style={styles.item}>
          <Button title="Update" onPress={() => handleFirmwareUpdate()} />
        </View>
        <View style={styles.item}>
          <Button title="Update v2" onPress={() => handleFirmwareUpdateV2()} />
        </View>
        {Platform.OS === 'web' ? (
          <>
            <View style={styles.item}>
              <Button title="Update with local file" onPress={() => handleFirmwareUpdateV2()} />
            </View>
            <View style={styles.item}>
              <input type="file" onChange={e => onFileChange(e, data => setSelectedFile(data))} />
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    borderRadius: 12,
    borderColor: '#cccccc',
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 12,
    padding: 12,
    height: 'auto',
  },
  item: {
    flexDirection: 'column',
    paddingStart: 12,
    paddingEnd: 12,
    paddingVertical: 8,
  },
  input: {
    height: 35,
    borderWidth: 1,
    padding: 4,
  },
});
