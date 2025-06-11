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
} from "./ui/sidebar";
import { Badge } from "./ui/Badge";
import { Card, CardContent } from "./ui/Card";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDeviceStore } from "../store/deviceStore";
import DeviceIcon from "./device/DeviceIcon";
import {
  Home,
  Smartphone,
  Link as LinkIcon,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { getDeviceLabel } from "@onekeyfe/hd-core";

// 导入图片
import onekeyLogo from "~/assets/onekey.png";

const navigationItems = [
  {
    title: "common.home",
    url: "/",
    icon: Home,
  },
  {
    title: "common.deviceMethods",
    url: "/device-methods",
    icon: Smartphone,
  },
  {
    title: "common.chainMethods",
    url: "/chains",
    icon: LinkIcon,
  },
  {
    title: "common.logs",
    url: "/logs",
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
      return t("device.connected");
    }
    return t("device.disconnected");
  };

  const getStatusVariant = () => {
    if (currentDevice) {
      return "default";
    }
    return "secondary";
  };

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center">
            <img
              src={onekeyLogo}
              alt="OneKey"
              className="w-8 h-8 object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-base">
              OneKey Developer Portal
            </span>
            <span className="text-sm text-muted-foreground">Hardware SDK</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* 设备状态 */}
        {currentDevice && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sm font-medium">
              {t("device.status")}
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
                          className="text-xs px-1.5 py-0.5"
                        >
                          {getStatusText()}
                        </Badge>
                      </div>
                      <p className="font-medium text-xs truncate">
                        {currentDevice.label ||
                          getDeviceLabel(currentDevice.features)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
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
        {currentDevice && (
          <SidebarSeparator className="bg-border/50 dark:bg-border" />
        )}

        {/* 导航菜单 - 优化版本 */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-medium">
            {t("common.navigation")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    size="lg"
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        {t(item.title)}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="py-2 w-full">
          <div className="text-sm text-muted-foreground w-full text-center">
            <div className="font-medium">OneKey SDK v1.0.0</div>
            <div className="mt-1">© 2025 OneKey</div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
