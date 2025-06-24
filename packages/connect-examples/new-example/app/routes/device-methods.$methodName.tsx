import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Cpu, Settings } from 'lucide-react';
import MethodExecutor from '../components/common/MethodExecutor';
import { PageLayout } from '../components/common/PageLayout';
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { MethodExecuteBoundary } from '../components/common/MethodExecuteBoundary';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { useMethodResolver } from '../hooks/useMethodResolver';
import { useHardwareMethodExecution } from '../hooks/useHardwareMethodExecution';
import { useDeviceStore } from '../store/deviceStore';
import { firmware } from '../data/methods/firmware';

const DeviceMethodExecutePage: React.FC = () => {
  const { methodName } = useParams();
  const { currentDevice } = useDeviceStore();

  const { selectedMethod, isMethodNotFound } = useMethodResolver({
    methodName,
  });
  const { executeMethod } = useHardwareMethodExecution();

  // 创建包装函数，在执行时传递方法配置
  const handleMethodExecution = useCallback(
    async (params: Record<string, unknown>): Promise<Record<string, unknown>> => {
      if (!selectedMethod) {
        throw new Error('Method configuration not found');
      }
      const result = await executeMethod(params, selectedMethod);
      return result;
    },
    [executeMethod, selectedMethod]
  );

  return (
    <MethodExecuteBoundary
      methodName={methodName}
      basePath="/device-methods"
      baseLabel="Device"
      baseIcon={Cpu}
      checkNotFound={isMethodNotFound}
    >
      {selectedMethod && (
        <PageLayout fixedHeight={true}>
          <div className="h-full flex flex-col">
            <div className="flex-1 flex flex-col px-4 py-2 min-h-0">
              {/* 面包屑导航 - 固定高度 */}
              <div className="flex-shrink-0 mb-3">
                <Breadcrumb
                  items={[
                    {
                      label: 'Device',
                      href: '/device-methods',
                      icon: Cpu,
                    },
                    { label: selectedMethod.method, icon: Settings },
                  ]}
                />
              </div>

              {/* 执行器 - 填充剩余空间 */}
              <div className="flex-1 min-h-0">
                {!currentDevice ? (
                  <DeviceNotConnectedState showFullPage={true} />
                ) : (
                  <MethodExecutor
                    methodConfig={selectedMethod}
                    executionHandler={handleMethodExecution}
                    className="h-full"
                    type={
                      firmware.api.some(m => m.method === selectedMethod.method)
                        ? 'firmware'
                        : 'standard'
                    }
                  />
                )}
              </div>
            </div>
          </div>
        </PageLayout>
      )}
    </MethodExecuteBoundary>
  );
};

export default DeviceMethodExecutePage;
