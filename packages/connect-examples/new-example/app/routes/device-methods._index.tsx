import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Download,
  Settings,
  Zap,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  Info,
} from 'lucide-react';

import { Badge } from '../components/ui/Badge';
import { Separator } from '../components/ui/Separator';
import { PageLayout } from '../components/common/PageLayout';
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { Breadcrumb } from '../components/ui/Breadcrumb';

import { device } from '../data/methods/device';
import { firmware } from '../data/methods/firmware';
import type { UnifiedMethodConfig } from '../data/types';

// 方法分类定义
interface MethodCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  methods: UnifiedMethodConfig[];
}

const DeviceMethodsIndexPage: React.FC = () => {
  const navigate = useNavigate();

  // 获取所有方法数据
  const allMethods = useMemo(() => {
    // 将device方法转换为统一格式
    const convertedDeviceMethods = device.api.map(method => ({
      method: method.method,
      description: method.description,
      deprecated: method.deprecated || false,
      noDeviceIdReq: method.noDeviceIdReq,
      noConnIdReq: method.noConnIdReq,
      presets: method.presets,
    }));

    // 将firmware方法转换为统一格式
    const convertedFirmwareMethods = firmware.api.map(method => ({
      method: method.method,
      description: method.description,
      deprecated: method.deprecated || false,
      noDeviceIdReq: method.noDeviceIdReq,
      noConnIdReq: method.noConnIdReq,
      presets: method.presets,
    }));

    console.log('Device methods found:', convertedDeviceMethods.length);
    console.log('Firmware methods found:', convertedFirmwareMethods.length);
    console.log('Total methods:', convertedDeviceMethods.length + convertedFirmwareMethods.length);
    console.log(
      'All method names:',
      [...convertedDeviceMethods, ...convertedFirmwareMethods].map(m => m.method)
    );

    return [...convertedDeviceMethods, ...convertedFirmwareMethods];
  }, []);

  // 智能分类逻辑
  const categories = useMemo((): MethodCategory[] => {
    const basicMethods: UnifiedMethodConfig[] = [];
    const deviceManagementMethods: UnifiedMethodConfig[] = [];
    const firmwareMethods: UnifiedMethodConfig[] = [];
    const releaseMethods: UnifiedMethodConfig[] = [];
    const controlMethods: UnifiedMethodConfig[] = [];

    allMethods.forEach(method => {
      const methodName = method.method.toLowerCase();

      // 基本操作
      if (
        [
          'searchdevices',
          'getfeatures',
          'getonekeyfeatures',
          'getpassphrasestate',
          'cancel',
        ].includes(methodName)
      ) {
        basicMethods.push(method);
      }
      // 固件更新
      else if (methodName.includes('firmwareupdate') || methodName.includes('updatebootloader')) {
        firmwareMethods.push(method);
      }
      // 版本信息检查
      else if (methodName.includes('check') && methodName.includes('release')) {
        releaseMethods.push(method);
      }
      // 设备控制
      else if (methodName.includes('reboot') || methodName.includes('bootloader')) {
        controlMethods.push(method);
      }
      // 设备管理
      else {
        deviceManagementMethods.push(method);
      }
    });

    return [
      {
        id: 'basic',
        name: 'Basic Operations',
        description: 'Device connectivity & info',
        icon: Zap,
        color: 'text-slate-700',
        bgColor: 'bg-slate-50',
        borderColor: 'border-slate-200',
        methods: basicMethods,
      },
      {
        id: 'device',
        name: 'Device Management',
        description: 'PIN, settings & security',
        icon: Settings,
        color: 'text-slate-700',
        bgColor: 'bg-slate-50',
        borderColor: 'border-slate-200',
        methods: deviceManagementMethods,
      },
      {
        id: 'firmware',
        name: 'Firmware Update',
        description: 'Firmware, bootloader & BLE updates',
        icon: Download,
        color: 'text-slate-700',
        bgColor: 'bg-slate-50',
        borderColor: 'border-slate-200',
        methods: firmwareMethods,
      },
      {
        id: 'release',
        name: 'Release Information',
        description: 'Version checks & release data',
        icon: Info,
        color: 'text-slate-700',
        bgColor: 'bg-slate-50',
        borderColor: 'border-slate-200',
        methods: releaseMethods,
      },
      {
        id: 'control',
        name: 'Device Control',
        description: 'Reboot & bootloader operations',
        icon: RefreshCw,
        color: 'text-slate-700',
        bgColor: 'bg-slate-50',
        borderColor: 'border-slate-200',
        methods: controlMethods,
      },
    ].filter(category => category.methods.length > 0);
  }, [allMethods]);

  // 统计信息
  const totalMethods = allMethods.length;

  // 处理方法选择
  const handleMethodSelect = (method: UnifiedMethodConfig) => {
    // 统一导航到设备方法路由
    navigate(`/device-methods/${method.method}`);
  };

  // 渲染方法项
  const renderMethodItem = (method: UnifiedMethodConfig) => {
    return (
      <div
        key={method.method}
        onClick={() => handleMethodSelect(method)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleMethodSelect(method);
          }
        }}
        role="button"
        tabIndex={0}
        className="onekey-method-item group px-4 py-4.5 border-b border-border/30 last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="text-lg font-bold text-foreground bg-muted/50 px-4 py-2 rounded border border-border/30">
              {method.method}
            </div>

            {/* 状态标签 */}
            <div className="flex items-center gap-1">
              {method.deprecated && (
                <Badge
                  variant="outline"
                  className="text-xs bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 px-1.5 py-0"
                >
                  <AlertTriangle className="w-3 h-3" />
                </Badge>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground truncate">{method.description}</p>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0 ml-3" />
      </div>
    );
  };

  // 渲染分类卡片
  const renderCategoryCard = (category: MethodCategory) => {
    const CategoryIcon = category.icon;

    return (
      <div
        key={category.id}
        className="onekey-category-card bg-card border border-border/50 shadow-sm rounded-lg overflow-hidden flex flex-col"
      >
        <div className="category-header py-1.5 px-4">
          <div className="onekey-category-title">
            <div className="flex items-center gap-1">
              <div className="p-1 rounded-lg bg-muted/50 border border-border/30">
                <CategoryIcon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold">{category.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1 font-light opacity-70">
                  {category.description}
                </p>
              </div>
              <Badge variant="secondary" className="text-xs font-medium">
                {category.methods.length}
              </Badge>
            </div>
          </div>
        </div>

        {/* 方法列表 */}
        <div className="p-1.5 pt-0">
          <div className="space-y-2">
            {category.methods.map(method => renderMethodItem(method))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <PageLayout>
      <div className="mx-auto px-6 py-6 space-y-6">
        {/* 顶部导航和统计 */}
        <div className="flex items-center justify-between">
          <Breadcrumb items={[{ label: 'Device', icon: Cpu }]} />

          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{totalMethods} methods</span>
            <span className="mx-2">•</span>
            <span>{categories.length} categories</span>
          </div>
        </div>

        {/* 设备连接状态 */}
        <DeviceNotConnectedState />

        <Separator className="my-8" />

        {/* 分类网格 */}
        <div className="grid lg:grid-cols-3 gap-6 auto-rows-fr">
          {categories.map(category => renderCategoryCard(category))}
        </div>
      </div>
    </PageLayout>
  );
};

export default DeviceMethodsIndexPage;
