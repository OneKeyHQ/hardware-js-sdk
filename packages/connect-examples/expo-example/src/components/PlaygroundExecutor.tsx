import { useCallback, useContext, useState } from 'react';

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
  // const [isLoading, setIsLoading] = useState(false);

  const executeMethod = useCallback(async () => {
    try {
      if (!sdk) return intl.formatMessage({ id: 'tip__sdk_not_ready' });

      const connectId = selectedDevice?.connectId ?? '';
      // @ts-expect-error
      const deviceId = selectedDevice?.features?.deviceId ?? '';
      const { method } = methodPayload;
      // setIsLoading(true);

      let requestParams;
      try {
        const rawParams = await onAcquireParams();
        requestParams = {
          ...commonParams,
          retryCount: 1,
          ...rawParams,
        };

        // 处理带回调的特殊方法
        if (method === 'allNetworkGetAddress' && 'loopMode' in rawParams && rawParams.loopMode) {
          // 提供一个默认的回调函数，显示实时进度
          let callbackCount = 0;
          // @ts-expect-error
          requestParams.onLoopItemResponse = (data: any, error: any) => {
            callbackCount += 1;
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] Callback ${callbackCount}:`, { data, error });

            // 在UI中显示实时进度
            onExecute(
              JSON.stringify(
                {
                  type: 'realtime_callback',
                  callbackIndex: callbackCount,
                  timestamp,
                  success: !error,
                  address: data?.payload?.address || data?.address,
                  path: data?.path,
                  network: data?.network,
                  error: error?.message,
                  data,
                  rawError: error,
                },
                null,
                2
              )
            );
          };
        }
      } catch (error) {
        requestParams = {
          ...commonParams,
          retryCount: 1,
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
    } finally {
      // setIsLoading(false);
    }
  }, [sdk, intl, selectedDevice, methodPayload, onExecute, commonParams, onAcquireParams]);

  return (
    // <Button id="try_it_out" variant="primary" onPress={executeMethod} loading={isLoading}>
    <Button id="try_it_out" variant="primary" onPress={executeMethod}>
      {intl.formatMessage({ id: 'action__try_it' })}
    </Button>
  );
};

export default PlaygroundExecutor;
