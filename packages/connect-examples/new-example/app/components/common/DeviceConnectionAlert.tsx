import { Info } from "lucide-react";
import { Card, CardContent } from "~/components/ui/Card";
import { useDeviceStore } from "~/store/deviceStore";

interface DeviceConnectionAlertProps {
  message?: string;
  className?: string;
}

export function DeviceConnectionAlert({
  message = "请先连接硬件设备后再执行操作",
  className = "",
}: DeviceConnectionAlertProps) {
  const { currentDevice } = useDeviceStore();

  if (currentDevice) {
    return null;
  }

  return (
    <Card className={`border-yellow-200 bg-yellow-50 ${className}`}>
      <CardContent className="py-4">
        <div className="flex items-center space-x-2 text-yellow-800">
          <Info className="h-5 w-5" />
          <span>{message}</span>
        </div>
      </CardContent>
    </Card>
  );
}
