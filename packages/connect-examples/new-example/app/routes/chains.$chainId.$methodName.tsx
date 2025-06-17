import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Layers, Settings } from 'lucide-react';
import UnifiedMethodExecutor from '../components/common/UnifiedMethodExecutor';
import { PageLayout } from '../components/common/PageLayout';
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { MethodExecuteBoundary } from '../components/common/MethodExecuteBoundary';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { useMethodResolver } from '../hooks/useMethodResolver';
import { useMethodExecution } from '../hooks/useMethodExecution';
import { useDeviceStore } from '../store/deviceStore';
import { ChainIcon } from '../components/icons/ChainIcon';

const ChainMethodExecutePage: React.FC = () => {
  const { chainId, methodName } = useParams();
  const { currentDevice } = useDeviceStore();

  const { selectedChain, selectedMethod, isMethodNotFound } = useMethodResolver({
    chainId,
    methodName,
  });
  const { executeMethod } = useMethodExecution({
    basePath: '/chains',
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
      basePath="/chains"
      baseLabel="Blockchain Methods"
      baseIcon={Layers}
      checkNotFound={isMethodNotFound}
    >
      {selectedChain && selectedMethod && (
        <PageLayout fixedHeight={true}>
          <div className="h-full flex flex-col">
            <div className="flex-1 flex flex-col px-4 py-2 min-h-0">
              {/* 面包屑导航 - 固定高度 */}
              <div className="flex-shrink-0 mb-3">
                <Breadcrumb
                  items={[
                    {
                      label: 'Blockchain Methods',
                      href: '/chains',
                      icon: Layers,
                    },
                    {
                      label: selectedChain.name,
                      href: `/chains/${chainId}`,
                      icon: () => <ChainIcon chainId={selectedChain.id} size={16} />,
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
                  <UnifiedMethodExecutor
                    methodConfig={selectedMethod}
                    executionHandler={handleMethodExecution}
                    className="h-full"
                    type="standard"
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

export default ChainMethodExecutePage;
