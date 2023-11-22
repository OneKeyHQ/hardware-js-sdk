import { StyleSheet, Switch, Text, View } from 'react-native';
import { useCommonParams } from '../provider/CommonParamsProvider';
import { CommonInput } from './CommonInput';
import { SwitchInput } from './SwitchInput';

export default function CommonParamsView() {
  const { commonParams, setCommonParams: setOptionalParams } = useCommonParams();

  const handleSetParam = (param: string, value: any) => {
    setOptionalParams({ ...commonParams, [param]: value });
  };

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Common Parameters</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <SwitchInput
          label="保持 Session"
          value={!!commonParams.keepSession}
          onToggle={value => handleSetParam('keepSession', value)}
        />
        <CommonInput
          label="重试次数"
          type="number"
          value={commonParams.retryCount?.toString() ?? ''}
          onChange={value => handleSetParam('retryCount', parseInt(value))}
        />
        <CommonInput
          label="重试间隔时长"
          type="number"
          value={commonParams.pollIntervalTime?.toString() ?? ''}
          onChange={value => handleSetParam('pollIntervalTime', parseInt(value))}
        />
        <CommonInput
          label="连接超时事件"
          type="number"
          value={commonParams.timeout?.toString() ?? ''}
          onChange={value => handleSetParam('timeout', parseInt(value))}
        />
        <CommonInput
          label="passphrase State"
          type="text"
          value={commonParams.passphraseState ?? ''}
          onChange={value => handleSetParam('passphraseState', value)}
        />
        <SwitchInput
          label="init session"
          value={!!commonParams.initSession}
          onToggle={value => handleSetParam('initSession', value)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFF',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
  },
  commonParamItem: {
    marginBottom: 16,
  },
  input: {
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 4,
    padding: 6,
    margin: 2,
    fontSize: 16,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 14,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
});
