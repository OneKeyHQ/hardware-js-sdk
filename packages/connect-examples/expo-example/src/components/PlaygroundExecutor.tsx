import { useCallback, useContext, useState } from 'react';
import { useIntl } from 'react-intl';
import { CoreApi } from '@onekeyfe/hd-core';

import HardwareSDKContext from '../provider/HardwareSDKContext';
import { useDevice } from '../provider/DeviceProvider';
import { useCommonParams } from '../provider/CommonParamsProvider';
import { Button } from './ui/Button';

import type { CommonParams } from '@onekeyfe/hd-core';

export type MethodPayload = {
  method: string;
  noConnIdReq?: boolean;
  noDeviceIdReq?: boolean;
  connectProtocol?: CommonParams['connectProtocol'];
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
      // @ts-expect-error legacy transport Features do not expose normalized deviceId
      const deviceId = selectedDevice?.features?.deviceId ?? '';
      const { method } = methodPayload;
      // setIsLoading(true);

      let requestParams;
      try {
        const rawParams = await onAcquireParams();
        requestParams = {
          ...commonParams,
          connectProtocol: methodPayload.connectProtocol ?? commonParams.connectProtocol,
          retryCount: 1,
          ...rawParams,
        };

        if (method === 'allNetworkGetAddressByLoop') {
          // @ts-expect-error
          requestParams.onLoopItemResponse = (data: any) => {
            onExecute(JSON.stringify({ data }, null, 2));
          };
          // @ts-expect-error
          requestParams.onAllItemsResponse = (data: any, error: any) => {
            onExecute(JSON.stringify({ data, error }, null, 2));
          };
        }
      } catch (error) {
        requestParams = {
          ...commonParams,
          connectProtocol: methodPayload.connectProtocol ?? commonParams.connectProtocol,
          retryCount: 1,
        };
      }

      console.log('requestParams: ', requestParams);

      let res;
      if (methodPayload.noConnIdReq) {
        console.info('[REQUEST] call sdk', { method, params: requestParams });
        res = await (sdk as any)[method](requestParams);
      } else if (methodPayload.noDeviceIdReq) {
        // if (!selectedDevice) return intl.formatMessage({ id: 'tip__need_connect_device_first' });
        console.info('[REQUEST] call sdk', { method, connectId, params: requestParams });
        res = await (sdk as any)[method](connectId, requestParams);
      } else {
        // if (!selectedDevice) return intl.formatMessage({ id: 'tip__need_connect_device_first' });
        console.info('[REQUEST] call sdk', { method, connectId, deviceId, params: requestParams });
        res = await (sdk as any)[method](connectId, deviceId, requestParams);
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
