import React from "react";
import touch from "../../assets/deviceMockup/touch.png";
import proBlack from "../../assets/deviceMockup/pro-black.png";
import proWhite from "../../assets/deviceMockup/pro-white.png";
import mini from "../../assets/deviceMockup/mini.png";
import pure from "../../assets/deviceMockup/pure.png";
import classic1s from "../../assets/deviceMockup/classic1s.png";

interface DeviceIconProps {
  deviceType?: string;
  size?: number;
  className?: string;
}

// 设备类型映射到图片路径
const deviceImageMap: Record<string, string> = {
  touch: touch,
  pro: proBlack,
  "pro-white": proWhite,
  mini: mini,
  pure: pure,
  classic1s: classic1s,
  default: proBlack,
};

export const DeviceIcon: React.FC<DeviceIconProps> = ({
  deviceType = "default",
  size = 64,
  className = "",
}) => {
  const imagePath = deviceImageMap[deviceType] || deviceImageMap.default;

  return (
    <img
      src={imagePath}
      alt={`OneKey ${deviceType}`}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

export default DeviceIcon;
