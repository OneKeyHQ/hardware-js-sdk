import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from './ui/sidebar';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDeviceStore } from '../store/deviceStore';
import { useTransportPersistence } from '../store/persistenceStore';
import {
  Home,
  Smartphone,
  Link as LinkIcon,
  FileText,
  CheckCircle,
  XCircle,
  Server,
  Info,
  ListChecks,
  Usb,
  UploadCloud,
} from 'lucide-react';
import { getDeviceLabel } from '@onekeyfe/hd-core';
import packageJson from '../../package.json';

// 导入图片
import onekeyLogo from '../assets/onekey.png';

// 版本信息
const VERSION = packageJson.version;
const COMMIT_SHA = process.env.COMMIT_SHA || 'dev-build';
const PUSH_TIMESTAMP = process.env.PUSH_TIMESTAMP || process.env.BUILD_TIME || __BUILD_TIME__;

const formatVersionTimestamp = (timestamp?: string) => {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toISOString().replace('T', ' ').slice(0, 16);
};

const VERSION_TIMESTAMP = formatVersionTimestamp(PUSH_TIMESTAMP);

const navigationItems = [
  {
    title: 'common.home',
    url: '/',
    icon: Home,
  },
  {
    title: 'common.device',
    url: '/device-methods',
    icon: Smartphone,
  },
  {
    title: 'common.chainMethods',
    url: '/chains',
    icon: LinkIcon,
  },
  {
    title: 'common.emulator',
    url: '/emulator',
    icon: Server,
  },
  {
    title: 'common.logs',
    url: '/logs',
    icon: FileText,
  },
  {
    title: 'common.proDebug',
    url: '/pro-debug',
    icon: Usb,
  },
  {
    title: 'common.pro2Debug',
    url: '/pro2-debug',
    icon: Usb,
  },
  {
    title: 'common.pro2Update',
    url: '/pro2-update',
    icon: UploadCloud,
  },
  {
    title: 'common.pro2Onboarding',
    url: '/pro2-onboarding',
    icon: ListChecks,
  },
  {
    title: 'common.methodBatchTest',
    url: '/method-batch-test',
    icon: ListChecks,
  },
  {
    title: 'common.deviceInfoTimingTest',
    url: '/device-info-timing-test',
    icon: ListChecks,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { t } = useTranslation();
  const { currentDevice } = useDeviceStore();
  const navigate = useNavigate();

  const { preferredType: transportType } = useTransportPersistence();

  const getStatusIcon = () => {
    if (currentDevice) {
      return <CheckCircle className="h-4 w-4 text-primary dark:text-primary" />;
    }
    return <XCircle className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (currentDevice) {
      return t('device.connected');
    }
    return t('device.disconnected');
  };

  const getStatusVariant = () => {
    if (currentDevice) {
      return 'default';
    }
    return 'secondary';
  };

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center">
            <img src={onekeyLogo} alt="OneKey" className="w-8 h-8 object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base">{t('header.title')}</span>
            <span className="text-sm text-muted-foreground font-medium">Hardware JS SDK</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* 设备状态 */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold">
            {t('device.status')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <Card className="border-border/60 bg-card/60 dark:bg-card/80 dark:border-border/40 backdrop-blur-sm">
              <CardContent className="p-3 space-y-2">
                {currentDevice ? (
                  <>
                    {/* 连接状态和设备名称 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon()}
                        <Badge
                          variant={getStatusVariant()}
                          className="text-xs px-2 py-0.5 font-medium"
                        >
                          {getStatusText()}
                        </Badge>
                      </div>
                      {/* 设备详情按钮 - 优化设计 */}
                      <button
                        onClick={() => navigate('/device-info')}
                        className="group relative flex items-center gap-2 px-3 py-2 rounded-lg bg-background hover:bg-accent text-foreground hover:text-accent-foreground border border-border hover:border-border transition-all duration-200 hover:shadow-sm"
                        title="View Device Details"
                      >
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 transition-transform group-hover:scale-105" />
                          <span className="text-xs font-semibold">Details</span>
                        </div>
                      </button>
                    </div>

                    {/* 设备信息 */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-medium">
                          {t('common.deviceName')}
                        </span>
                        <span className="text-xs font-bold text-foreground truncate max-w-24">
                          {currentDevice.label || getDeviceLabel(currentDevice.features)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-medium">
                          {t('common.deviceType')}
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                          {currentDevice.deviceType.toUpperCase() || 'Unknown'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-medium">
                          {t('common.uuid')}
                        </span>
                        <span
                          className="text-xs font-mono text-foreground truncate max-w-24"
                          title={currentDevice.connectId}
                        >
                          {currentDevice.connectId?.slice(0, 8)}...
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-medium">
                          {t('common.transport')}
                        </span>
                        <Badge variant="outline" className="text-xs px-1.5 py-0 font-medium">
                          {transportType === 'webusb'
                            ? 'WebUSB'
                            : transportType === 'jsbridge'
                            ? 'JSBridge'
                            : transportType || 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 未连接设备时的占位内容 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon()}
                        <Badge
                          variant={getStatusVariant()}
                          className="text-xs px-2 py-0.5 font-medium"
                        >
                          {getStatusText()}
                        </Badge>
                      </div>
                    </div>

                    {/* 占位信息 - 保持与连接状态相同的高度 */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-medium">
                          {t('common.deviceName')}
                        </span>
                        <span className="text-xs text-muted-foreground">--</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-medium">
                          {t('common.deviceType')}
                        </span>
                        <span className="text-xs text-muted-foreground">--</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-medium">
                          {t('common.uuid')}
                        </span>
                        <span className="text-xs text-muted-foreground">--</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-medium">
                          {t('common.transport')}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0 font-medium text-muted-foreground border-muted"
                        >
                          {transportType === 'webusb'
                            ? 'WebUSB'
                            : transportType === 'jsbridge'
                            ? 'JSBridge'
                            : transportType === 'emulator'
                            ? 'Emulator'
                            : '--'}
                        </Badge>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 分割线 - 始终显示 */}
        <SidebarSeparator className="onekey-divider mx-3" />

        {/* 导航菜单 - 优化版本 */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold">
            {t('common.navigation')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url} size="lg">
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span className="text-sm font-semibold">{t(item.title)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="py-3 px-2">
          <div className="text-center space-y-1">
            <div className="text-sm font-bold text-foreground">{t('header.title')}</div>
            <div className="text-xs text-muted-foreground font-mono">
              v{VERSION} • {COMMIT_SHA.slice(0, 8)}
            </div>
            {VERSION_TIMESTAMP ? (
              <div className="text-[10px] leading-4 text-muted-foreground/80 font-mono">
                {VERSION_TIMESTAMP}
              </div>
            ) : null}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
