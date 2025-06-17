import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Settings } from 'lucide-react';
import UnifiedMethodExecutor from '../components/common/UnifiedMethodExecutor';
import { PageLayout } from '../components/common/PageLayout';
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { MethodExecuteBoundary } from '../components/common/MethodExecuteBoundary';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { useMethodExecution } from '../hooks/useMethodExecution';
import { useDeviceStore } from '../store/deviceStore';
import firmwareUpdateMethods from '../data/methods/firmwareUpdate';

const FirmwareUpdateMethodExecutePage: React.FC = () => {
  const { methodName } = useParams();
  const { currentDevice } = useDeviceStore();

  // 查找选中的方法
  const selectedMethod = firmwareUpdateMethods.find(method => method.method === methodName);
  const isMethodNotFound = () => !selectedMethod;

  const { executeMethod } = useMethodExecution({
    basePath: '/firmware-update',
  });

  // 创建包装函数，在执行时传递方法配置
  const handleMethodExecution = useCallback(
    async (params: Record<string, unknown>): Promise<Record<string, unknown>> => {
      if (!selectedMethod) {
        throw new Error('方法配置未找到');
      }
      const result = await executeMethod(params, selectedMethod);
      // 将 ExecutionResult 转换为 Record<string, unknown>
      return {
        success: result.success,
        data: result.data,
        error: result.error,
        duration: result.duration,
      };
    },
    [executeMethod, selectedMethod]
  );

  return (
    <MethodExecuteBoundary
      methodName={methodName}
      basePath="/firmware-update"
      baseLabel="Firmware Update"
      baseIcon={Download}
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
                      label: 'Firmware Update',
                      href: '/firmware-update',
                      icon: Download,
                    },
                    { label: selectedMethod.method, icon: Settings },
                  ]}
                />
              </div>

              {/* 执行器 - 填充剩余空间 */}
              <div className="flex-1 min-h-0">
                {!currentDevice && !selectedMethod.noDeviceIdReq ? (
                  <DeviceNotConnectedState showFullPage={true} />
                ) : (
                  <UnifiedMethodExecutor
                    methodConfig={selectedMethod}
                    executionHandler={handleMethodExecution}
                    className="h-full"
                    type="firmware"
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

export default FirmwareUpdateMethodExecutePage;
