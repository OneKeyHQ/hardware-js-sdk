import { useCallback, useContext, useState } from 'react';
import { useIntl } from 'react-intl';
import { CoreApi } from '@onekeyfe/hd-core';

import HardwareSDKContext from '../provider/HardwareSDKContext';
import { useDevice } from '../provider/DeviceProvider';
import { useCommonParams } from '../provider/CommonParamsProvider';
import { executeProtocolAwareMethod } from '../utils/protocolAwareMethod';
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
          retryCount: 1,
        };
      }

      console.info('[REQUEST] call sdk', {
        method,
        hasConnectId: Boolean(connectId),
        hasDeviceId: Boolean(deviceId),
      });
      let mode: 'no-connection' | 'connection' | 'device' = 'device';
      if (methodPayload.noConnIdReq) {
        mode = 'no-connection';
      } else if (methodPayload.noDeviceIdReq) {
        mode = 'connection';
      }
      const res = await executeProtocolAwareMethod({
        sdk,
        method,
        connectId,
        deviceId,
        params: requestParams,
        protocol: selectedDevice?.connectProtocol,
        mode,
      });

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
