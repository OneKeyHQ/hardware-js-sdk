import { Stack } from 'tamagui';
import { useIntl } from 'react-intl';
import { useCommonParams } from '../provider/CommonParamsProvider';
import { CommonInput } from './CommonInput';
import { SwitchInput } from './SwitchInput';
import PanelView from './ui/Panel';

export default function CommonParamsView() {
  const intl = useIntl();
  const { commonParams, setCommonParams: setOptionalParams } = useCommonParams();

  const handleSetParam = (param: string, value: any) => {
    setOptionalParams({ ...commonParams, [param]: value });
  };

  return (
    <PanelView title={intl.formatMessage({ id: 'title__common_parameters' })}>
      <Stack gap="$4" flexDirection="row" flexWrap="wrap">
        <SwitchInput
          label={intl.formatMessage({ id: 'label__keep_session' })}
          value={!!commonParams.keepSession}
          onToggle={value => handleSetParam('keepSession', value)}
        />
        <CommonInput
          label={intl.formatMessage({ id: 'label__retry_count' })}
          type="number"
          value={commonParams.retryCount?.toString() ?? ''}
          onChange={value => handleSetParam('retryCount', parseInt(value))}
        />
        <CommonInput
          label={intl.formatMessage({ id: 'label__retry_interval_time' })}
          type="number"
          value={commonParams.pollIntervalTime?.toString() ?? ''}
          onChange={value => handleSetParam('pollIntervalTime', parseInt(value))}
        />
        <CommonInput
          label={intl.formatMessage({ id: 'label__connection_timeout' })}
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
          label={intl.formatMessage({ id: 'label__init_session' })}
          value={!!commonParams.initSession}
          onToggle={value => handleSetParam('initSession', value)}
        />
        <SwitchInput
          label={intl.formatMessage({ id: 'label__use_empty_passphrase' })}
          value={!!commonParams.useEmptyPassphrase}
          onToggle={value => handleSetParam('useEmptyPassphrase', value)}
        />
        <SwitchInput
          // TODO: i18n
          label="detectBootloaderDevice"
          value={!!commonParams.detectBootloaderDevice}
          onToggle={value => handleSetParam('detectBootloaderDevice', value)}
        />
      </Stack>
    </PanelView>
  );
}
