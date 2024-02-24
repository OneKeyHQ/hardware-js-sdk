import { useCallback, useContext } from 'react';

import { useIntl } from 'react-intl';
import HardwareSDKContext from '../provider/HardwareSDKContext';
import { useDevice } from '../provider/DeviceProvider';
import { useCommonParams } from '../provider/CommonParamsProvider';
import { Button } from './ui/Button';

export type MethodPayload = {
  method: string;
  noConnIdReq?: boolean;
  noDeviceIdReq?: boolean;
};

interface PlaygroundExecutorProps {
  methodPayload: MethodPayload;
  onAcquireParams: () => Promise<object>;
  onExecute: (response: string) => void;
}

const PlaygroundExecutor: React.FC<PlaygroundExecutorProps> = ({
  methodPayload,
  onAcquireParams,
  onExecute,
}: PlaygroundExecutorProps) => {
  const intl = useIntl();
  const { sdk } = useContext(HardwareSDKContext);
  const { selectedDevice } = useDevice();
  const { commonParams } = useCommonParams();

  const executeMethod = useCallback(async () => {
    try {
      if (!sdk) return intl.formatMessage({ id: 'tip__sdk_not_ready' });

      const connectId = selectedDevice?.connectId ?? '';
      const deviceId = selectedDevice?.features?.deviceId ?? '';
      const { method } = methodPayload;

      let requestParams;
      try {
        requestParams = {
          ...commonParams,
          ...(await onAcquireParams()),
        };
      } catch (error) {
        requestParams = {
          ...commonParams,
        };
      }

      console.log('requestParams: ', requestParams);

      let res;
      if (methodPayload.noConnIdReq) {
        // @ts-expect-error
        res = await sdk[`${method}` as keyof typeof sdk]();
      } else if (methodPayload.noDeviceIdReq) {
        if (!selectedDevice) return intl.formatMessage({ id: 'tip__need_connect_device_first' });
        // @ts-expect-error
        res = await sdk[`${method}` as keyof typeof sdk](connectId, requestParams);
      } else {
        if (!selectedDevice) return intl.formatMessage({ id: 'tip__need_connect_device_first' });
        // @ts-expect-error
        res = await sdk[`${method}` as keyof typeof sdk](connectId, deviceId, requestParams);
      }

      onExecute(JSON.stringify(res, null, 2));
    } catch (error: any) {
      // Adjust according to your error type
      onExecute(JSON.stringify({ error: error.message }, null, 2));
    }
  }, [sdk, intl, selectedDevice, methodPayload, onExecute, commonParams, onAcquireParams]);

  return (
    <Button id="try_it_out" variant="primary" onPress={executeMethod}>
      {intl.formatMessage({ id: 'action__try_it' })}
    </Button>
  );
};

export default PlaygroundExecutor;
