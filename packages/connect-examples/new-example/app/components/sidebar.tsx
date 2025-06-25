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
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDeviceStore } from '../store/deviceStore';
import { useSDK } from '../hooks/useSDK';
import { useToast } from '../hooks/use-toast';
import { searchDevices } from '../services/hardwareService';
import {
  Home,
  Smartphone,
  Link as LinkIcon,
  FileText,
  CheckCircle,
  XCircle,
  Server,
  Search,
} from 'lucide-react';
import { getDeviceLabel } from '@onekeyfe/hd-core';
import packageJson from '../../package.json';

// 导入图片
import onekeyLogo from '../assets/onekey.png';

// 版本信息
const VERSION = packageJson.version;
const COMMIT_SHA = process.env.COMMIT_SHA || 'dev-build';

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
];

export function AppSidebar() {
  const location = useLocation();
  const { t } = useTranslation();
  const {
    currentDevice,
    transportType,
    isConnecting,
    sdkInitState,
    setIsConnecting,
    setConnectedDevices,
    setCurrentDevice,
    setDeviceFeatures,
  } = useDeviceStore();

  const { getSDKInstance } = useSDK();
  const { toast } = useToast();

  // 快速连接设备
  const handleQuickConnect = async () => {
    if (!sdkInitState.isInitialized) {
      toast({
        title: t('transport.sdkNotReady'),
        description: t('transport.pleaseWaitForInit'),
        variant: 'warning',
      });
      return;
    }

    setIsConnecting(true);

    try {
      // 搜索设备
      const searchResult = await searchDevices();

      if (searchResult.success && searchResult.payload) {
        const devices = searchResult.payload;
        setConnectedDevices(devices);

        // 自动连接第一个设备
        if (devices.length > 0) {
          const targetDevice = devices[0];
          setCurrentDevice(targetDevice);

          // 获取设备特征信息
          const sdk = await getSDKInstance();
          if (targetDevice.connectId && targetDevice.deviceId) {
            const featuresResult = await sdk.getFeatures(targetDevice.connectId);
            if (featuresResult.success && featuresResult.payload) {
              setDeviceFeatures(featuresResult.payload);
            }
          }

          toast({
            title: t('device.connected'),
            description: `${t('device.connectedTo')} ${
              targetDevice.label || targetDevice.deviceType
            }`,
            variant: 'default',
          });
        } else {
          toast({
            title: t('transport.noDevicesFound'),
            description: t('transport.ensureDeviceConnected'),
            variant: 'warning',
          });
        }
      } else {
        const errorMessage = searchResult.payload?.error || t('transport.searchDeviceFailed');
        toast({
          title: t('transport.searchFailed'),
          description: errorMessage,
          variant: 'warning',
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t('transport.unknownConnectionError');
      toast({
        title: t('transport.connectionTip'),
        description: errorMessage,
        variant: 'warning',
      });
    } finally {
      setIsConnecting(false);
    }
  };

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
            <span className="font-bold text-base">OneKey Developer Portal</span>
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

                    {/* 连接按钮 */}
                    <div className="pt-2 border-t border-border/30">
                      <Button
                        onClick={handleQuickConnect}
                        disabled={isConnecting || !sdkInitState.isInitialized}
                        size="sm"
                        className="w-full h-8 text-xs"
                        variant="outline"
                      >
                        {isConnecting ? (
                          <>
                            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1.5" />
                            {t('device.connecting')}
                          </>
                        ) : (
                          <>
                            <Search className="w-3 h-3 mr-1.5" />
                            {t('device.searchDevices')}
                          </>
                        )}
                      </Button>
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
