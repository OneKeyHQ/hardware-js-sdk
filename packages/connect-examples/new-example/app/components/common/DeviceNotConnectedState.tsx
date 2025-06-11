import { Card, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { Home, AlertTriangle, ArrowRight } from "lucide-react";
import { useDeviceStore } from "../../store/deviceStore";

interface DeviceNotConnectedStateProps {
  className?: string;
  showFullPage?: boolean;
  title?: string;
  description?: string;
}

export function DeviceNotConnectedState({
  className = "",
  showFullPage = false,
  title,
  description,
}: DeviceNotConnectedStateProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentDevice } = useDeviceStore();

  // 如果设备已连接，不显示此组件
  if (currentDevice) {
    return null;
  }

  const handleGoHome = () => {
    navigate("/");
  };

  if (showFullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md mx-auto text-center space-y-6">
          {/* 简化的图标区域 */}
          <div className="w-16 h-16 mx-auto bg-muted/20 rounded-full flex items-center justify-center border border-border/30">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>

          {/* 标题和描述 */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {title || t("device.connectionRequired")}
            </h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              {description || t("device.pleaseConnectFirst")}
            </p>
          </div>

          {/* 简化的操作按钮  */}
          <div className="space-y-2">
            <Button
              onClick={handleGoHome}
              variant="outline"
              size="lg"
              className="w-full bg-background border-border text-foreground hover:bg-muted/50 gap-2 py-3"
            >
              <Home className="h-4 w-4" />
              {t("common.goToHomePage")}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={`border-border/50 bg-muted/20 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {title || t("device.connectionRequired")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {description || t("device.pleaseConnectFirst")}
              </p>
            </div>
          </div>
          <Button
            onClick={handleGoHome}
            variant="outline"
            size="sm"
            className="bg-background border-border text-foreground hover:bg-muted/50 gap-1.5 shrink-0"
          >
            <Home className="h-3 w-3" />
            {t("common.goHome")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
