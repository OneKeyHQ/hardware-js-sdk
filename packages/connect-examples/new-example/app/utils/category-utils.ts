import type { MethodCategory } from "~/data/types";
import {
  Info,
  Shield,
  Wrench,
  Key,
  FileText,
  MousePointer,
} from "lucide-react";

// 分类显示名称映射
export const CATEGORY_DISPLAY_NAMES: Record<MethodCategory, string> = {
  address: "地址",
  publicKey: "公钥",
  signing: "签名",
  transaction: "交易",
  message: "消息",
  device: "设备",
  info: "信息",
  security: "安全",
  management: "管理",
  basic: "基础",
  advanced: "高级",
};

// 分类图标映射
export const CATEGORY_ICONS = {
  address: Info,
  publicKey: Key,
  transaction: FileText,
  signing: MousePointer,
  device: Info,
  info: Info,
  security: Shield,
  management: Wrench,
  basic: Info,
} as const;

// 分类颜色映射
export const CATEGORY_COLORS: Record<MethodCategory, string> = {
  address: "text-blue-600 bg-blue-50 border-blue-200",
  publicKey: "text-green-600 bg-green-50 border-green-200",
  transaction: "text-orange-600 bg-orange-50 border-orange-200",
  signing: "text-red-600 bg-red-50 border-red-200",
  device: "text-gray-600 bg-gray-50 border-gray-200",
  info: "text-blue-600 bg-blue-50 border-blue-200",
  security: "text-green-600 bg-green-50 border-green-200",
  management: "text-orange-600 bg-orange-50 border-orange-200",
  basic: "text-gray-600 bg-gray-50 border-gray-200",
  message: "text-purple-600 bg-purple-50 border-purple-200",
  advanced: "text-pink-600 bg-pink-50 border-pink-200",
};

/**
 * 获取分类的显示名称
 */
export function getCategoryDisplayName(category: MethodCategory): string {
  return CATEGORY_DISPLAY_NAMES[category] || category;
}

/**
 * 获取分类的图标组件
 */
export function getCategoryIcon(category: MethodCategory) {
  return (
    CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] ||
    CATEGORY_ICONS.info
  );
}

/**
 * 获取分类的颜色样式
 */
export function getCategoryColor(category: MethodCategory): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.info;
}
