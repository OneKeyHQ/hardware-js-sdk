import React from "react";
import { type IDeviceType } from "@onekeyfe/hd-core";
import { getDeviceImagePath } from "../../utils/deviceTypeUtils";

interface DeviceIconProps {
  deviceType: IDeviceType;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

const DeviceIcon: React.FC<DeviceIconProps> = ({
  deviceType,
  size = "md",
  className = "",
}) => {
  // 尺寸映射
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
    "2xl": "w-32 h-32",
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src={getDeviceImagePath(deviceType)}
        alt={deviceType}
        className={`${sizeClasses[size]} object-contain`}
        onError={(e) => {
          // 如果图片加载失败，使用一个通用的设备图标
          const target = e.target as HTMLImageElement;
          target.src = "/images/devices/onekey-default.png";
        }}
      />
    </div>
  );
};

export default DeviceIcon;
