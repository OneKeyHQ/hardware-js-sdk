export const isOnekeyDevice = (name: string | null, id?: string): boolean => {
  if (id?.startsWith?.('MI')) {
    return true;
  }

  // 过滤 BixinKeyxxx 和 Kxxxx
  // i 忽略大小写模式
  const re = /(BixinKey\d{10})|(K\d{4})/i;
  if (name && re.exec(name)) {
    return true;
  }
  return false;
};
