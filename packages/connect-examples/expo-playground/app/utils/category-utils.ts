import { Info, Shield, Wrench, Key, FileText, MousePointer } from 'lucide-react';
import type { MethodCategory } from '../data/types';

// 分类图标映射
export const CATEGORY_ICONS = {
  address: Info,
  publicKey: Key,
  transaction: FileText,
  signing: MousePointer,
  device: Info,
  info: Info,
  firmware: Wrench,
  other: Shield,
} as const;

// 分类颜色映射
export const CATEGORY_COLORS: Record<string, string> = {
  address: 'text-blue-600 bg-blue-50 border-blue-200',
  publicKey: 'text-green-600 bg-green-50 border-green-200',
  transaction: 'text-orange-600 bg-orange-50 border-orange-200',
  signing: 'text-red-600 bg-red-50 border-red-200',
  device: 'text-gray-600 bg-gray-50 border-gray-200',
  info: 'text-blue-600 bg-blue-50 border-blue-200',
  firmware: 'text-orange-600 bg-orange-50 border-orange-200',
  other: 'text-gray-600 bg-gray-50 border-gray-200',
};
/**
 * 获取分类的图标组件
 */
export function getCategoryIcon(category: MethodCategory) {
  return CATEGORY_ICONS[category];
}

/**
 * 获取分类的颜色样式
 */
export function getCategoryColor(category: MethodCategory): string {
  return CATEGORY_COLORS[category];
}
