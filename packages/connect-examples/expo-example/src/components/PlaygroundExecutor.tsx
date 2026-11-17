import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Stack } from 'tamagui';

import HardwareSDKContext from '../provider/HardwareSDKContext';
import { useDevice } from '../provider/DeviceProvider';
import { useCommonParams } from '../provider/CommonParamsProvider';
import { executeProtocolAwareMethod } from '../utils/protocolAwareMethod';
import { Button } from './ui/Button';

import type { PrepareSigningSample } from '../utils/manualSigning/common';

type ManualJob = { cancelled: boolean; cancel: () => void };

export type MethodPayload = {
  method: string;
  noConnIdReq?: boolean;
  noDeviceIdReq?: boolean;
};

interface PlaygroundExecutorProps {
  methodPayload: MethodPayload;
  onAcquireParams: () => Promise<object>;
  onExecute: (response: string) => void;
  prepareSample?: PrepareSigningSample;
  onPrepared?: (params: object) => void;
}

const PlaygroundExecutor: React.FC<PlaygroundExecutorProps> = ({
  methodPayload,
  onAcquireParams,
  onExecute,
  prepareSample,
  onPrepared,
}: PlaygroundExecutorProps) => {
  const intl = useIntl();
  const { sdk } = useContext(HardwareSDKContext);
  const { selectedDevice } = useDevice();
  const { commonParams } = useCommonParams();
  const [isManualRunning, setManualRunning] = useState(false);
  const activeManual = useRef<ManualJob | null>(null);
  const selectedRef = useRef(selectedDevice);
  selectedRef.current = selectedDevice;

  const cancelManual = useCallback(() => {
    const job = activeManual.current;
    if (job) {
      job.cancelled = true;
      job.cancel();
    }
  }, []);

  useEffect(
    () => () => {
      cancelManual();
      activeManual.current = null;
    },
    [cancelManual]
  );

  const executeMethod = useCallback(
    async (prepare?: PrepareSigningSample) => {
      if (activeManual.current) return;
      let job: ManualJob | null = null;
      let failedResponse: unknown;
      try {
        if (!sdk) return intl.formatMessage({ id: 'tip__sdk_not_ready' });

        const connectId = selectedDevice?.connectId ?? '';
        const deviceId = selectedDevice?.features?.deviceId ?? '';
        const { method } = methodPayload;
        let mode: 'no-connection' | 'connection' | 'device' = 'device';
        if (methodPayload.noConnIdReq) mode = 'no-connection';
        else if (methodPayload.noDeviceIdReq) mode = 'connection';

        const call = async (callMethod: string, params: object) => {
          const assertActive = () => {
            if (
              job &&
              (job.cancelled ||
                activeManual.current !== job ||
                selectedRef.current?.connectId !== connectId ||
                selectedRef.current?.features?.deviceId !== deviceId)
            ) {
              throw new Error('Manual signing cancelled or the selected device changed.');
            }
          };
          assertActive();
          const result = await executeProtocolAwareMethod({
            sdk,
            method: callMethod,
            connectId,
            deviceId,
            mode,
            protocol: selectedDevice?.connectProtocol,
            params: { ...commonParams, retryCount: 1, ...params },
          });
          assertActive();
          if (!result.success) failedResponse = result;
          return result;
        };

        let requestParams;
        if (prepare) {
          if (!connectId || !deviceId) throw new Error('Select a connected device first.');
          job = { cancelled: false, cancel: () => sdk.cancel(connectId) };
          activeManual.current = job;
          setManualRunning(true);
          requestParams = await prepare(call);
          onPrepared?.(requestParams);
        } else {
          try {
            requestParams = await onAcquireParams();

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
            requestParams = {};
          }
        }

        console.info('[REQUEST] call sdk', {
          method,
          hasConnectId: Boolean(connectId),
          hasDeviceId: Boolean(deviceId),
        });
        const res = await call(method, requestParams);

        onExecute(JSON.stringify(res, null, 2));
      } catch (error) {
        if (!job || activeManual.current === job) {
          onExecute(
            JSON.stringify(
              failedResponse ?? {
                error: error instanceof Error ? error.message : 'Signing failed.',
              },
              null,
              2
            )
          );
        }
      } finally {
        if (job && activeManual.current === job) {
          activeManual.current = null;
          setManualRunning(false);
        }
      }
    },
    [sdk, intl, selectedDevice, methodPayload, onExecute, commonParams, onAcquireParams, onPrepared]
  );

  const manualAction = methodPayload.method === 'moneroKeyImageSync' ? '同步' : '签名';

  return (
    <Stack gap="$2">
      <Button
        id="try_it_out"
        variant="primary"
        onPress={() => executeMethod()}
        disabled={isManualRunning}
      >
        {intl.formatMessage({ id: 'action__try_it' })}
      </Button>
      {prepareSample && (
        <Button onPress={isManualRunning ? cancelManual : () => executeMethod(prepareSample)}>
          {isManualRunning ? `取消${manualAction}` : `生成测试数据并${manualAction}`}
        </Button>
      )}
    </Stack>
  );
};

export default PlaygroundExecutor;
