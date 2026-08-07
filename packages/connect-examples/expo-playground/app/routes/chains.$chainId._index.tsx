import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Layers } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { PageLayout } from '../components/common/PageLayout';
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { ChainBoundary } from '../components/common/ChainBoundary';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { useMethodResolver } from '../hooks/useMethodResolver';
import { ChainIcon } from '../components/icons/ChainIcon';

const ChainMethodsIndexPage: React.FC = () => {
  const { chainId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const { selectedChain, isChainNotFound } = useMethodResolver({ chainId });

  // 处理方法选择
  const handleMethodSelect = (methodName: string) => {
    navigate(`/chains/${chainId}/${methodName}`);
  };

  // 处理键盘事件
  const handleKeyDown = (event: React.KeyboardEvent, callback: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  };

  // 获取翻译后的描述
  const getTranslatedDescription = (description?: string) => {
    if (!description) return '';
    return description.startsWith('methodDescriptions.') ? t(description) : description;
  };

  // 过滤方法 - 添加空值检查
  const filteredMethods =
    selectedChain?.methods.filter(method => {
      const translatedDescription = getTranslatedDescription(method.description);
      return (
        method.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
        translatedDescription.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }) || [];

  return (
    <ChainBoundary chainId={chainId} checkNotFound={isChainNotFound}>
      {selectedChain && (
        <PageLayout fixedHeight={true}>
          <div className="flex-1 flex flex-col px-4 py-3 min-h-0 h-full">
            {/* 面包屑导航 + 搜索框 */}
            <div className="flex-shrink-0 mb-4">
              <div className="flex items-center justify-between gap-4">
                <Breadcrumb
                  items={[
                    {
                      label: t('chains.title'),
                      href: '/chains',
                      icon: Layers,
                    },
                    {
                      label: selectedChain.id,
                      icon: () => <ChainIcon chainId={selectedChain.id} size={16} />,
                    },
                  ]}
                />
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder={t('chains.searchPlaceholder')}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* 链信息头部 */}
            <div className="flex-shrink-0 mb-4">
              <div className="relative overflow-hidden bg-gradient-to-br from-card to-card/80 border border-border/30 rounded-xl p-4">
                <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.02] to-foreground/[0.05]" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2 bg-muted/50 backdrop-blur-sm rounded-lg border border-border/50">
                    <ChainIcon chainId={selectedChain.id} size={24} />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-xl font-bold text-foreground mb-1 tracking-tight">
                      {selectedChain.id}
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium">
                      {t('chains.methodsCount', {
                        count: filteredMethods.length,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 设备连接状态 */}
            <div className="flex-shrink-0 mb-4">
              <DeviceNotConnectedState />
            </div>

            {/* 方法列表 - 填充剩余空间 */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="grid gap-3 pb-4">
                {filteredMethods.map((method, methodIndex) => (
                  <div
                    key={`${selectedChain.id}-${method.method}-${methodIndex}`}
                    className="group relative overflow-hidden bg-card border border-border/50 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:border-border hover:shadow-md hover:shadow-black/5 dark:hover:shadow-white/5"
                    onClick={() => handleMethodSelect(method.method)}
                    onKeyDown={e => handleKeyDown(e, () => handleMethodSelect(method.method))}
                    tabIndex={0}
                    role="button"
                    aria-label={`Execute ${method.method}`}
                  >
                    {/* 微妙的悬停效果 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-foreground/0 via-foreground/0 to-foreground/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-sm font-semibold font-mono text-foreground group-hover:text-foreground/80 transition-colors duration-200">
                              {method.method}
                            </h3>
                            {method.deprecated && (
                              <span className="text-xs bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-800">
                                Deprecated
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed pr-6">
                            {getTranslatedDescription(method.description) ||
                              'No description available'}
                          </p>
                        </div>

                        {/* 简约箭头 */}
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-6 h-6 rounded-lg bg-muted/30 flex items-center justify-center group-hover:bg-muted/50 group-hover:scale-105 transition-all duration-200">
                            <svg
                              className="w-3 h-3 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors duration-200"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M13 7l5 5m0 0l-5 5m5-5H6"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 空状态 */}
              {filteredMethods.length === 0 && searchTerm && (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-16 h-16 bg-muted/20 rounded-xl flex items-center justify-center mb-4">
                    <Search className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2 tracking-tight">
                    {t('chains.noResults', { searchTerm: '' }).split(' ')[0]} methods found
                  </h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
                    {t('chains.noResults', { searchTerm })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </PageLayout>
      )}
    </ChainBoundary>
  );
};

export default ChainMethodsIndexPage;
