import { useState, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Button, Card } from '@onekeyhq/ui-components';
import { KnownDevice, SearchDevice } from '@onekeyfe/hd-core';
import { setDevice } from '../store/reducers/runtime';
import { serviceHardware } from '../hardware';
import { devicePromise } from '../process-transport';

export default function SearchDevices() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [searchedDevices, setSearchedDevices] = useState<SearchDevice[]>([]);

  const handleSearchDevice = useCallback(() => {
    console.log('search device');
    setLoading(true);

    serviceHardware.startDeviceScan(
      (response) => {
        if (!response.success) {
          console.log('device error: ', response.payload);
          setLoading(false);
          return;
        }

        setSearchedDevices(response.payload);
      },
      () => {}
    );
  }, []);

  useEffect(() => {
    handleSearchDevice();
    return () => {
      serviceHardware.stopScan();
    };
  }, [handleSearchDevice]);

  return (
    <div>
      <Button onClick={() => handleSearchDevice()} size="lg" loading={loading} type="primary">
        搜索设备
      </Button>
      <div className="okd-mt-4">
        {searchedDevices.map((d) => (
          // @ts-expect-error
          <Card key={d.connectId}>
            <Button
              className="okd-flex-1"
              size="sm"
              onClick={() => {
                dispatch(setDevice(d as KnownDevice));
                setLoading(false);
                serviceHardware.stopScan();
                devicePromise?.resolve();
              }}
              type="primary"
            >
              Select
            </Button>
            <span className="okd-text-gray-700 okd-px-2">
              {(d as any).features?.label ?? d.name}
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
