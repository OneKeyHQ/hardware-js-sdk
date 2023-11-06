import { useCallback, useContext } from 'react';
import { Button } from 'react-native';
import HardwareSDKContext from '../provider/HardwareSDKContext';
import { useDevice } from '../provider/DeviceProvider';
import { useCommonParams } from '../provider/CommonParamsProvider';

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
  const { sdk } = useContext(HardwareSDKContext);
  const { selectedDevice } = useDevice();
  const { commonParams } = useCommonParams();

  const executeMethod = useCallback(async () => {
    try {
      if (!sdk) return alert('sdk is not ready');

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
        if (!selectedDevice) return alert('please select a device first');
        // @ts-expect-error
        res = await sdk[`${method}` as keyof typeof sdk](connectId, requestParams);
      } else {
        if (!selectedDevice) return alert('please select a device first');
        // @ts-expect-error
        res = await sdk[`${method}` as keyof typeof sdk](connectId, deviceId, requestParams);
      }

      onExecute(JSON.stringify(res, null, 2));
    } catch (error: any) {
      // Adjust according to your error type
      onExecute(JSON.stringify({ error: error.message }, null, 2));
    }
  }, [sdk, selectedDevice, methodPayload, onExecute, commonParams, onAcquireParams]);

  return <Button title="Try it out" onPress={executeMethod} />;
};

export default PlaygroundExecutor;
