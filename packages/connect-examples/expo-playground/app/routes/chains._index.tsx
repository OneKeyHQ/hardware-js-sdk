import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Layers, ChevronRight } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { PageLayout } from '../components/common/PageLayout';
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { ListBoundary } from '../components/common/ListBoundary';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { signerMethodsRegistry } from '../hooks/useMethodsRegistry';
import { ChainIcon } from '../components/icons/ChainIcon';
import type { ChainConfig } from '../data/types';

const ChainsIndexPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const chains = signerMethodsRegistry.chains;

  const filteredChains = chains.filter(chain =>
    chain.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 处理链选择
  const handleChainSelect = (chain: ChainConfig) => {
    navigate(`/chains/${chain.id}`);
  };

  // 处理键盘事件
  const handleKeyDown = (event: React.KeyboardEvent, callback: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  };

  return (
    <ListBoundary title={t('chains.title')} icon={Layers}>
      <PageLayout fixedHeight={true}>
        <div className="flex-1 flex flex-col px-4 py-3 min-h-0 h-full">
          {/* 面包屑导航 + 搜索框 */}
          <div className="flex-shrink-0 mb-4">
            <div className="flex items-center justify-between gap-4">
              <Breadcrumb items={[{ label: t('chains.title'), icon: Layers }]} />
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

          {/* 页面信息 */}
          <div className="flex-shrink-0 mb-3">
            <p className="text-sm text-muted-foreground">
              {t('chains.availableChains', { count: filteredChains.length })}
            </p>
          </div>

          {/* 设备连接状态 */}
          <div className="flex-shrink-0 mb-4">
            <DeviceNotConnectedState />
          </div>

          {/* 链列表 - 填充剩余空间 */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 pb-4">
              {filteredChains.map(chain => (
                <div
                  key={chain.id}
                  className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 hover:shadow-sm"
                  onClick={() => handleChainSelect(chain)}
                  onKeyDown={e => handleKeyDown(e, () => handleChainSelect(chain))}
                  tabIndex={0}
                  role="button"
                  aria-label={t('chains.exploreChain', { chainId: chain.id })}
                >
                  <ChainIcon chainId={chain.id} size={28} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{chain.id}</h3>
                    <p className="text-xs text-muted-foreground">
                      {t('chains.methodsCount', {
                        count: signerMethodsRegistry.getChainMethods(chain.id).length,
                      })}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              ))}
            </div>

            {/* 空状态 */}
            {filteredChains.length === 0 && searchTerm && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  {t('chains.noResults', { searchTerm })}
                </p>
              </div>
            )}
          </div>
        </div>
      </PageLayout>
    </ListBoundary>
  );
};

export default ChainsIndexPage;
