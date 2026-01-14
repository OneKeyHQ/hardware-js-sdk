const PRO_I18N_ZH = {
  homeSwipeUpToShowApps: '向上滑动查看应用程序',
  processing: '处理中...',
  lockTapToUnlock: '轻触屏幕以解锁',

  enterPin: '输入 PIN',

  cancel: '取消',
  confirm: '确认',

  done: '完成',
  qrCode: '二维码',
  address: '地址',

  myAddress: '我的地址',
  addressTitle: (network) => `${network} 地址`
}

const PRO_I18N_EN = {
  homeSwipeUpToShowApps: 'Swipe up to show apps',
  processing: 'Processing...',
  lockTapToUnlock: 'Tap to unlock',

  enterPin: 'Enter PIN',

  cancel: 'Cancel',
  confirm: 'Confirm',

  done: 'Done',
  qrCode: 'QR Code',
  address: 'Address',

  myAddress: 'My Address',
  addressTitle: (network) => `${network} Address`
}

export function getProI18n(locale) {
  if ((locale ?? 'zh') === 'en') return PRO_I18N_EN
  return PRO_I18N_ZH
}
