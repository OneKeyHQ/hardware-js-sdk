import { PRO_COLORS, PRO_SCREEN } from './constants'

function joinPath(basePath, pathname) {
  const base = (basePath ?? '').trim()
  if (!base) return pathname
  if (pathname.startsWith('/')) return `${base}${pathname}`
  return `${base}/${pathname}`
}

export function ProDeviceStatusBar({
  basePath,
  usb = false,
  ble = 'enabled',
  battery = 60
}) {
  const iconBase = joinPath(basePath, '/hardware-pro/res')
  const bleIcon =
    ble === 'connected'
      ? `${iconBase}/ble-connected.png`
      : ble === 'disabled'
        ? `${iconBase}/ble-disabled.png`
        : `${iconBase}/ble-enabled.png`

  const batteryIcon = `${iconBase}/battery-${battery}-white.png`

  return (
    <div
      className="absolute left-0 top-0 flex items-center justify-end gap-1"
      style={{
        width: PRO_SCREEN.width,
        height: PRO_SCREEN.statusBarHeight,
        padding: '10px 12px 0',
        color: PRO_COLORS.WHITE,
        opacity: 0.9
      }}
    >
      {usb ? (
        <img
          src={`${iconBase}/usb.png`}
          alt=""
          draggable={false}
          style={{ width: 22, height: 22 }}
        />
      ) : null}

      <img
        src={bleIcon}
        alt=""
        draggable={false}
        style={{ width: 22, height: 22 }}
      />

      <img
        src={batteryIcon}
        alt=""
        draggable={false}
        style={{ width: 24, height: 24 }}
      />
    </div>
  )
}
