import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Layers, Settings } from 'lucide-react';
import MethodExecutor from '../components/common/MethodExecutor';
import { PageLayout } from '../components/common/PageLayout';
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { MethodExecuteBoundary } from '../components/common/MethodExecuteBoundary';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { useMethodResolver } from '../hooks/useMethodResolver';
import { useHardwareMethodExecution } from '../hooks/useHardwareMethodExecution';
import { useDeviceStore } from '../store/deviceStore';
import { ChainIcon } from '../components/icons/ChainIcon';

const ChainMethodExecutePage: React.FC = () => {
  const { chainId, methodName } = useParams();
  const { currentDevice } = useDeviceStore();

  const { selectedChain, selectedMethod, isMethodNotFound } = useMethodResolver({
    chainId,
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
      basePath="/chains"
      baseLabel="Blockchain Methods"
      baseIcon={Layers}
      checkNotFound={isMethodNotFound}
    >
      {selectedChain && selectedMethod && (
        <PageLayout fixedHeight={true}>
          <div className="flex-1 flex flex-col px-4 py-3 min-h-0 h-full">
            {/* 面包屑导航 */}
            <div className="flex-shrink-0 mb-4">
              <Breadcrumb
                items={[
                  {
                    label: 'Blockchain Methods',
                    href: '/chains',
                    icon: Layers,
                  },
                  {
                    label: selectedChain.id,
                    href: `/chains/${chainId}`,
                    icon: () => <ChainIcon chainId={selectedChain.id} size={16} />,
                  },
                  { label: selectedMethod.method, icon: Settings },
                ]}
              />
            </div>

            {/* 设备未连接时显示小提示 */}
            {!currentDevice && (
              <div className="flex-shrink-0 mb-4">
                <DeviceNotConnectedState showFullPage={false} />
              </div>
            )}

            {/* 执行器 - 填充剩余高度 */}
            <div className="flex-1 min-h-0">
              <MethodExecutor
                className="h-full"
                methodConfig={selectedMethod}
                executionHandler={handleMethodExecution}
                type="standard"
              />
            </div>
          </div>
        </PageLayout>
      )}
    </MethodExecuteBoundary>
  );
};

export default ChainMethodExecutePage;
