'use client'

import Image from 'next/image'
import { Check, X } from 'lucide-react'

const devices = [
  {
    name: 'OneKey Classic 1s',
    image: '/icons/devices/classic1s.png',
    bluetooth: true,
    usb: true,
    airGap: false,
    protocol: 'V1',
    description: { en: 'OneKey Classic 1s', zh: '经典款 Classic 1s' }
  },
  {
    name: 'OneKey Classic 1s Pure',
    image: '/icons/devices/classicPure.png',
    bluetooth: true,
    usb: true,
    airGap: false,
    protocol: 'V1',
    description: { en: 'Battery-free edition', zh: 'Classic 1s Pure 无电池版本' }
  },
  {
    name: 'OneKey Mini',
    image: '/icons/devices/mini.png',
    bluetooth: false,
    usb: true,
    airGap: false,
    protocol: 'V1',
    description: { en: 'Compact USB-only wallet', zh: '紧凑型 USB 钱包' }
  },
  {
    name: 'OneKey Touch',
    image: '/icons/devices/touch.png',
    bluetooth: true,
    usb: true,
    airGap: false,
    protocol: 'V1',
    description: { en: 'Full touchscreen experience', zh: '全触屏体验' }
  },
  {
    name: 'OneKey Pro',
    image: '/icons/devices/pro.png',
    bluetooth: true,
    usb: true,
    airGap: true,
    protocol: 'V1',
    description: { en: 'Premium with fingerprint security', zh: '旗舰版，支持指纹识别' }
  },
  {
    name: 'OneKey Pro 2',
    image: '/icons/devices/pro2.png',
    bluetooth: true,
    usb: true,
    airGap: true,
    protocol: 'V2',
    description: { en: 'Protocol V2 professional edition', zh: 'Protocol V2 专业版' }
  },
  {
    name: 'OneKey Neo',
    image: '/icons/devices/neo.png',
    bluetooth: true,
    usb: true,
    airGap: false,
    protocol: 'V2',
    description: { en: 'Protocol V2 compact edition, no camera', zh: 'Protocol V2 轻量版，无摄像头' }
  }
]

function SupportBadge({ supported }) {
  if (supported) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
        <Check className="w-4 h-4" />
        Supported
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500">
      <X className="w-4 h-4" />
      N/A
    </span>
  )
}

export function DeviceCompatibilityTable({ locale = 'en' }) {
  const isZh = locale === 'zh'
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH
    ? process.env.NEXT_PUBLIC_BASE_PATH.replace(/\/$/, '')
    : ''

  const labels = {
    en: {
      subtitle: 'Support status for Bluetooth, USB, Air-Gap, and protocol family',
      device: 'Device',
      bluetooth: 'Bluetooth',
      usb: 'USB',
      airGap: 'Air-Gap',
      protocol: 'Protocol',
    },
    zh: {
      subtitle: '蓝牙、USB、Air-Gap 与协议族支持状态',
      device: '设备',
      bluetooth: '蓝牙',
      usb: 'USB',
      airGap: 'Air-Gap',
      protocol: '协议',
    }
  }

  const t = labels[isZh ? 'zh' : 'en']

  return (
    <div className="my-6">
      {/* Subtitle only, no duplicate title */}
      <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
        {t.subtitle}
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <th className="text-left py-4 px-5 font-semibold text-zinc-900 dark:text-white" style={{ width: '32%' }}>
                {t.device}
              </th>
              <th className="text-center py-4 px-5 font-semibold text-zinc-900 dark:text-white" style={{ width: '17%' }}>
                {t.protocol}
              </th>
              <th className="text-center py-4 px-5 font-semibold text-zinc-900 dark:text-white" style={{ width: '17%' }}>
                {t.bluetooth}
              </th>
              <th className="text-center py-4 px-5 font-semibold text-zinc-900 dark:text-white" style={{ width: '17%' }}>
                {t.usb}
              </th>
              <th className="text-center py-4 px-5 font-semibold text-zinc-900 dark:text-white" style={{ width: '17%' }}>
                {t.airGap}
              </th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr
                key={device.name}
                className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-b-0 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/30 group"
              >
                {/* Device Info */}
                <td className="py-4 px-5">
                  <div className="flex items-center gap-4">
                    {/* Device Image */}
                    <div className="w-14 h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-105">
                      {device.image ? (
                        <Image
                          src={`${basePath}${device.image}`}
                          alt={device.name}
                          width={48}
                          height={48}
                          className="object-contain"
                          unoptimized
                        />
                      ) : (
                        <span className="text-sm font-semibold text-zinc-500">
                          {device.name.replace('OneKey ', '').slice(0, 3)}
                        </span>
                      )}
                    </div>
                    {/* Device Name & Description */}
                    <div>
                      <div className="font-semibold text-zinc-900 dark:text-white transition-colors">
                        {device.name}
                      </div>
                      <div className="text-sm text-zinc-500">
                        {device.description[isZh ? 'zh' : 'en']}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="py-4 px-5 text-center">
                  <span className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
                    {device.protocol}
                  </span>
                </td>

                {/* Bluetooth Support */}
                <td className="py-4 px-5 text-center">
                  <SupportBadge supported={device.bluetooth} />
                </td>

                {/* USB Support */}
                <td className="py-4 px-5 text-center">
                  <SupportBadge supported={device.usb} />
                </td>

                {/* Air-Gap Support */}
                <td className="py-4 px-5 text-center">
                  <SupportBadge supported={device.airGap} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DeviceCompatibilityTable
