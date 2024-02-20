import { Stack } from 'tamagui';
import { useCommonParams } from '../provider/CommonParamsProvider';
import { CommonInput } from './CommonInput';
import { SwitchInput } from './SwitchInput';
import PanelView from './ui/Panel';

export default function CommonParamsView() {
  const { commonParams, setCommonParams: setOptionalParams } = useCommonParams();

  const handleSetParam = (param: string, value: any) => {
    setOptionalParams({ ...commonParams, [param]: value });
  };

  return (
    <PanelView title="Common Parameters">
      <Stack gap="$4" flexDirection="row" flexWrap="wrap">
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
          label="Passphrase State"
          type="text"
          value={commonParams.passphraseState ?? ''}
          onChange={value => handleSetParam('passphraseState', value)}
        />
        <SwitchInput
          label="Init Session"
          value={!!commonParams.initSession}
          onToggle={value => handleSetParam('initSession', value)}
        />
      </Stack>
    </PanelView>
  );
}
