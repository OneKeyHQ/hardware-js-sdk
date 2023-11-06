import { useContext } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useCommonParams } from '../provider/CommonParamsProvider';

type SwitchInputProps = {
  value: boolean;
  onToggle: (value: boolean) => void;
  label: string;
};
const SwitchInput = ({ value, onToggle, label }: SwitchInputProps) => (
  <View style={styles.commonParamItem}>
    <Text style={styles.label}>{label}</Text>
    <Switch value={value} onValueChange={onToggle} />
  </View>
);

type NumberInputProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
};
const NumberInput = ({ value, onChange, label }: NumberInputProps) => (
  <View style={styles.commonParamItem}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      keyboardType="numeric"
      value={value}
      onChangeText={text => onChange(text.replace(/[^\d]+/, ''))}
    />
  </View>
);

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
        <NumberInput
          label="重试次数"
          value={commonParams.retryCount?.toString() ?? ''}
          onChange={value => handleSetParam('retryCount', parseInt(value))}
        />
        <NumberInput
          label="重试间隔时长"
          value={commonParams.pollIntervalTime?.toString() ?? ''}
          onChange={value => handleSetParam('pollIntervalTime', parseInt(value))}
        />
        <NumberInput
          label="连接超时事件"
          value={commonParams.timeout?.toString() ?? ''}
          onChange={value => handleSetParam('timeout', parseInt(value))}
        />
        <NumberInput
          label="passphrase State"
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
