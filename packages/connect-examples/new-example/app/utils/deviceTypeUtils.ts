import type { IDeviceType } from "@onekeyfe/hd-core";
import { EDeviceType } from "@onekeyfe/hd-shared";
import classic1s from "../assets/deviceMockup/classic1s.png";
import mini from "../assets/deviceMockup/mini.png";
import proBlack from "../assets/deviceMockup/pro-black.png";
import touch from "../assets/deviceMockup/touch.png";

/**
 * 检查是否为Classic系列设备 (包括 Classic、Classic1s、ClassicPure)
 * 使用SDK提供的EDeviceType枚举进行精确匹配
 */
export function isClassicModelDevice(
  deviceType: IDeviceType | undefined
): boolean {
  if (!deviceType) return false;
  return (
    deviceType === EDeviceType.Classic ||
    deviceType === EDeviceType.Classic1s ||
    deviceType === EDeviceType.ClassicPure ||
    deviceType === EDeviceType.Mini
  );
}

/**
 * 检查是否为Pro设备
 */
export function isTouchModelDevice(
  deviceType: IDeviceType | undefined
): boolean {
  if (!deviceType) return false;
  return deviceType === EDeviceType.Touch || deviceType === EDeviceType.Pro;
}
/**
 * 获取设备图片路径
 * 基于设备类型返回对应的图片路径
 */
export function getDeviceImagePath(
  deviceType: IDeviceType | undefined
): string {
  if (!deviceType) return "/assets/deviceMockup/pro-black.png";

  switch (deviceType) {
    case EDeviceType.Classic:
    case EDeviceType.Classic1s:
    case EDeviceType.ClassicPure:
      return classic1s;
    case EDeviceType.Mini:
      return mini;
    case EDeviceType.Pro:
      return proBlack;
    case EDeviceType.Touch:
      return touch;
    case EDeviceType.Unknown:
    default:
      return proBlack;
  }
}
