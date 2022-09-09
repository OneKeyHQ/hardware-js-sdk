import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Button } from '@onekeyhq/ui-components';
import type { RootState } from '../store';
import { SearchDevices, UiRequest, MethodState } from '../components';
import { setDevice } from '../store/reducers/runtime';

export default function Dashboard() {
  const device = useSelector((state: RootState) => state.runtime.device);
  const dispatch = useDispatch();

  useEffect(() => {
    const subscription = window.hardwareSDK.ipcRenderer.on('deep-linking', () => {
      console.log('deep-linking message');
    });

    return () => {
      subscription?.();
    };
  }, []);

  if (!device) {
    return <SearchDevices />;
  }
  return (
    <div>
      {/* @ts-expect-error */}
      <Card className="okd-mx-auto okd-w-[480px] okd-mb-2">
        <div
          className="okd-flex okd-items-center okd-justify-between"
          style={{ flexDirection: 'row' }}
        >
          <div className="okd-text-gray-700">Current Device: {device?.label}</div>
          <Button type="basic" onClick={() => dispatch(setDevice(null))}>
            Forget Device
          </Button>
        </div>
      </Card>
      <div className="okd-mb-2">
        <MethodState />
      </div>
      <UiRequest />
    </div>
  );
}
