import React, { useState } from 'react';
import { useNavigate } from '@remix-run/react';
import { Search, Download } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { PageLayout } from '../components/common/PageLayout';
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { ListBoundary } from '../components/common/ListBoundary';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Badge } from '../components/ui/Badge';
import firmwareUpdateMethods from '../data/methods/firmwareUpdate';
import type { MethodConfig } from '../data/types';

const FirmwareUpdateIndexPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // 获取固件更新方法
  const allMethods = firmwareUpdateMethods;

  // 过滤方法
  const filteredMethods = allMethods.filter(
    method =>
      method.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
      method.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 按类型分组
  const checkMethods = filteredMethods.filter(
    method =>
      method.method.toLowerCase().includes('check') ||
      method.method.toLowerCase().includes('release')
  );
  const updateMethodsList = ['firmwareUpdateV2', 'firmwareUpdateV3', 'deviceUpdateBootloader'];
  const updateMethods = filteredMethods
    .filter(method => updateMethodsList.includes(method.method))
    .filter(method => !checkMethods.includes(method));
  const deviceMethods = filteredMethods.filter(
    method =>
      method.method.toLowerCase().includes('reboot') ||
      method.method.toLowerCase().includes('Reboot') ||
      method.method.toLowerCase().includes('bootloader')
  );

  // 处理方法选择
  const handleMethodSelect = (methodName: string) => {
    navigate(`/firmware-update/${methodName}`);
  };

  // 处理键盘事件
  const handleKeyDown = (event: React.KeyboardEvent, callback: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  };

  // 渲染方法卡片
  const renderMethodCard = (method: MethodConfig, index: number, keyPrefix: string) => (
    <div
      key={`${keyPrefix}-${method.method}-${index}`}
      className="group relative overflow-hidden bg-card border border-border/50 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:border-border hover:shadow-md hover:shadow-black/5 dark:hover:shadow-white/5 hover:-translate-y-0.5"
      onClick={() => handleMethodSelect(method.method)}
      onKeyDown={e => handleKeyDown(e, () => handleMethodSelect(method.method))}
      tabIndex={0}
      role="button"
      aria-label={`Execute ${method.method}`}
    >
      {/* 微妙的悬停效果 */}
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/0 via-foreground/0 to-foreground/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base font-bold font-mono text-foreground group-hover:text-foreground/80 transition-colors duration-200">
                {method.method}
              </h3>
              {method.deprecated && (
                <Badge
                  variant="outline"
                  className="text-xs bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800 font-medium"
                >
                  Deprecated
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pr-6 font-medium">
              {method.description}
            </p>
          </div>

          {/* 简约箭头 */}
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-7 h-7 rounded-lg bg-muted/30 flex items-center justify-center group-hover:bg-muted/50 group-hover:scale-105 transition-all duration-200">
              <svg
                className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ListBoundary title="Firmware Update" icon={Download}>
      <PageLayout>
        <div className="mx-auto px-6 py-4 space-y-3">
          {/* 面包屑导航 + 搜索框 */}
          <div className="flex items-center justify-between gap-4">
            <Breadcrumb items={[{ label: 'Firmware Update', icon: Download }]} />
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search methods..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 font-medium"
              />
            </div>
          </div>

          {/* 页面信息 */}
          <div>
            <p className="text-sm text-muted-foreground font-medium">
              {filteredMethods.length} firmware update methods available
            </p>
          </div>

          {/* 设备连接状态 */}
          <DeviceNotConnectedState />

          {/* 方法列表 */}
          <div className="space-y-5">
            {/* 固件更新方法 */}
            {updateMethods.length > 0 && (
              <div className="space-y-3">
                <div className="bg-muted/50 dark:bg-muted/30 border border-border/60 dark:border-border rounded-lg p-5">
                  <h2 className="text-xl font-bold text-foreground tracking-tight">
                    Firmware Update
                  </h2>
                  <p className="text-muted-foreground dark:text-muted-foreground font-semibold mt-1 text-sm">
                    {updateMethods.length} methods to update device firmware
                  </p>
                </div>
                <div className="grid gap-2">
                  {updateMethods.map((method, index) => renderMethodCard(method, index, 'update'))}
                </div>
              </div>
            )}

            {/* 检查更新方法 */}
            {checkMethods.length > 0 && (
              <div className="space-y-3">
                <div className="bg-muted/50 dark:bg-muted/30 border border-border/60 dark:border-border rounded-lg p-5">
                  <h2 className="text-xl font-bold text-foreground tracking-tight">
                    Release Information
                  </h2>
                  <p className="text-muted-foreground dark:text-muted-foreground font-semibold mt-1 text-sm">
                    {checkMethods.length} methods to check firmware releases
                  </p>
                </div>
                <div className="grid gap-2">
                  {checkMethods.map((method, index) => renderMethodCard(method, index, 'check'))}
                </div>
              </div>
            )}

            {/* 设备控制方法 */}
            {deviceMethods.length > 0 && (
              <div className="space-y-3">
                <div className="bg-muted/50 dark:bg-muted/30 border border-border/60 dark:border-border rounded-lg p-5">
                  <h2 className="text-xl font-bold text-foreground tracking-tight">
                    Device Control
                  </h2>
                  <p className="text-muted-foreground dark:text-muted-foreground font-semibold mt-1 text-sm">
                    {deviceMethods.length} methods to control device state
                  </p>
                </div>
                <div className="grid gap-2">
                  {deviceMethods.map((method, index) => renderMethodCard(method, index, 'device'))}
                </div>
              </div>
            )}
          </div>

          {/* 空状态 */}
          {filteredMethods.length === 0 && searchTerm && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-muted/20 rounded-xl flex items-center justify-center mb-4">
                <Search className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 tracking-tight">
                No methods found
              </h3>
              <p className="text-muted-foreground text-center max-w-md leading-relaxed font-medium">
                Try adjusting your search terms or browse all available methods.
              </p>
            </div>
          )}
        </div>
      </PageLayout>
    </ListBoundary>
  );
};

export default FirmwareUpdateIndexPage;
