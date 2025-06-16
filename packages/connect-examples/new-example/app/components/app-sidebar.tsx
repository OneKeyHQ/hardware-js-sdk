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
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDeviceStore } from '../store/deviceStore';
import DeviceIcon from './device/DeviceIcon';
import {
  Home,
  Smartphone,
  Link as LinkIcon,
  FileText,
  CheckCircle,
  XCircle,
  Download,
} from 'lucide-react';
import { getDeviceLabel } from '@onekeyfe/hd-core';
import packageJson from '../../package.json';

// 导入图片
import onekeyLogo from '../assets/onekey.png';

// 版本信息
const VERSION = packageJson.version;
const COMMIT_SHA = import.meta.env.VITE_COMMIT_SHA || 'dev-build';

const navigationItems = [
  {
    title: 'common.home',
    url: '/',
    icon: Home,
  },
  {
    title: 'common.deviceMethods',
    url: '/device-methods',
    icon: Smartphone,
  },
  {
    title: 'common.firmwareUpdate',
    url: '/firmware-update',
    icon: Download,
  },
  {
    title: 'common.chainMethods',
    url: '/chains',
    icon: LinkIcon,
  },
  {
    title: 'common.logs',
    url: '/logs',
    icon: FileText,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { t } = useTranslation();
  const { currentDevice } = useDeviceStore();

  const getStatusIcon = () => {
    if (currentDevice) {
      return <CheckCircle className="h-4 w-4 text-primary" />;
    }
    return <XCircle className="h-4 w-4 text-muted-foreground" />;
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
            <span className="font-bold text-base">OneKey Developer Portal</span>
            <span className="text-sm text-muted-foreground font-medium">Hardware SDK</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* 设备状态 */}
        {currentDevice && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sm font-semibold">
              {t('device.status')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 mr-2">
                      <DeviceIcon
                        deviceType={currentDevice.deviceType}
                        size="md"
                        className="w-full h-full object-contain drop-shadow-sm"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon()}
                        <Badge
                          variant={getStatusVariant()}
                          className="text-xs px-1.5 py-0.5 font-medium"
                        >
                          {getStatusText()}
                        </Badge>
                      </div>
                      <p className="font-semibold text-xs truncate">
                        {currentDevice.label || getDeviceLabel(currentDevice.features)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate font-medium">
                        {currentDevice.connectId}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* 分割线 - 在设备状态和导航菜单之间 */}
        {currentDevice && <SidebarSeparator className="bg-border/50 dark:bg-border" />}

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
            <div className="text-sm font-bold text-foreground">OneKey Developer Portal</div>
            <div className="text-xs text-muted-foreground font-mono">
              v{VERSION} • {COMMIT_SHA.slice(0, 8)}
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
