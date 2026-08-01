import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Cpu,
  Download,
  Settings,
  Zap,
  ChevronRight,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Wrench,
} from 'lucide-react';

import { Badge } from '../components/ui/Badge';
import { Separator } from '../components/ui/Separator';
import { PageLayout } from '../components/common/PageLayout';
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { CollapsibleTrigger, CollapsibleContent } from '../components/ui/Collapsible';

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
  const { t } = useTranslation();

  // 折叠状态管理
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    basic: true, // 基础操作默认展开
  });

  // 切换分类展开状态
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

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
    const deviceMethods: UnifiedMethodConfig[] = [];
    const firmwareMethods: UnifiedMethodConfig[] = [];
    const advancedMethods: UnifiedMethodConfig[] = [];

    allMethods.forEach(method => {
      const methodName = method.method.toLowerCase();

      // 基本操作 - 最常用的
      if (
        [
          'searchdevices',
          'getfeatures',
          'getonekeyfeatures',
          'getpassphrasestate',
          'cancel',
          'devicesupportfeatures',
          'getlogs',
        ].includes(methodName)
      ) {
        basicMethods.push(method);
      }
      // 固件相关 - 所有固件和检查相关
      else if (
        methodName.includes('firmware') ||
        methodName.includes('bootloader') ||
        methodName.includes('check') ||
        methodName.includes('bridge') ||
        methodName.includes('reboot')
      ) {
        firmwareMethods.push(method);
      }
      // 设备管理 - 常用设备操作
      else if (
        ['devicesettings', 'devicechangepin', 'devicelock', 'devicecancel'].includes(methodName)
      ) {
        deviceMethods.push(method);
      }
      // 高级功能 - 包括U2F、验证、日志、危险操作等
      else {
        advancedMethods.push(method);
      }
    });

    return [
      {
        id: 'basic',
        name: t('deviceMethods.categories.basic.name'),
        description: t('deviceMethods.categories.basic.description'),
        icon: Zap,
        color: 'text-foreground',
        bgColor: 'bg-muted/50',
        borderColor: 'border-border',
        methods: basicMethods,
      },
      {
        id: 'device',
        name: t('deviceMethods.categories.device.name'),
        description: t('deviceMethods.categories.device.description'),
        icon: Settings,
        color: 'text-foreground',
        bgColor: 'bg-muted/50',
        borderColor: 'border-border',
        methods: deviceMethods,
      },
      {
        id: 'firmware',
        name: t('deviceMethods.categories.firmware.name'),
        description: t('deviceMethods.categories.firmware.description'),
        icon: Download,
        color: 'text-foreground',
        bgColor: 'bg-muted/50',
        borderColor: 'border-border',
        methods: firmwareMethods,
      },
      {
        id: 'advanced',
        name: t('deviceMethods.categories.advanced.name'),
        description: t('deviceMethods.categories.advanced.description'),
        icon: Wrench,
        color: 'text-foreground',
        bgColor: 'bg-muted/50',
        borderColor: 'border-border',
        methods: advancedMethods,
      },
    ].filter(category => category.methods.length > 0);
  }, [allMethods, t]);

  // 统计信息
  const totalMethods = allMethods.length;

  // 处理方法选择
  const handleMethodSelect = (method: UnifiedMethodConfig) => {
    // 统一导航到设备方法路由
    navigate(`/device-methods/${method.method}`);
  };

  // 渲染方法项 - 卡片式网格布局
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
        className="onekey-method-item group p-4 bg-muted/30 dark:bg-muted/20 border border-border/50 rounded-lg cursor-pointer hover:border-border hover:bg-muted/50 dark:hover:bg-muted/40 hover:shadow-md transition-all duration-200 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-foreground font-mono bg-background/80 dark:bg-background/60 px-3 py-1.5 rounded-md border border-border/50 shadow-sm text-nowrap">
            {method.method}
          </div>

          <div className="flex items-center gap-2">
            {/* 状态标签 */}
            {method.deprecated && (
              <Badge
                variant="outline"
                className="text-xs bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 px-1.5 py-0.5"
              >
                <AlertTriangle className="w-3 h-3" />
              </Badge>
            )}

            <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {method.description?.startsWith('methodDescriptions.')
            ? t(method.description)
            : method.description}
        </p>
      </div>
    );
  };

  // 渲染分类卡片 - 简洁优雅版本
  const renderCategoryCard = (category: MethodCategory) => {
    const CategoryIcon = category.icon;
    const isExpanded = expandedCategories[category.id] || false;

    return (
      <div
        key={category.id}
        className="onekey-category-card bg-card border border-border/60 rounded-lg overflow-hidden transition-all duration-200 hover:border-border"
      >
        {/* 分类头部 - 可点击折叠 */}
        <CollapsibleTrigger
          onClick={() => toggleCategory(category.id)}
          className="w-full px-5 py-4 hover:bg-muted/30 transition-colors hover:no-underline"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50">
              <CategoryIcon className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="flex-1 text-left">
              <h3 className="text-lg font-semibold text-foreground">{category.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm font-medium px-2.5 py-1">
                {category.methods.length}
              </Badge>

              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        {/* 方法列表 - 可折叠内容 */}
        <CollapsibleContent open={isExpanded}>
          <div className="border-t border-border/30 bg-muted/10 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {category.methods.map(method => renderMethodItem(method))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    );
  };

  return (
    <PageLayout fixedHeight={true}>
      <div className="flex-1 flex flex-col px-4 py-3 min-h-0 h-full">
        {/* 顶部导航和统计 */}
        <div className="flex-shrink-0 mb-4">
          <div className="flex items-center justify-between">
            <Breadcrumb items={[{ label: t('deviceMethods.title') || 'Device', icon: Cpu }]} />

            <div className="text-sm text-muted-foreground">
              <span className="font-medium">
                {t('deviceMethods.totalMethods', { count: totalMethods })}
              </span>
              <span className="mx-2">•</span>
              <span>{t('deviceMethods.totalCategories', { count: categories.length })}</span>
            </div>
          </div>
        </div>

        {/* 设备连接状态 */}
        <div className="flex-shrink-0 mb-4">
          <DeviceNotConnectedState />
        </div>

        <div className="flex-shrink-0 mb-4">
          <Separator />
        </div>

        {/* 分类列表 - 填充剩余空间 */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-3 pb-4">
            {/* 方法分类 */}
            {categories.map(category => renderCategoryCard(category))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default DeviceMethodsIndexPage;
