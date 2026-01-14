/**
 * @typedef {'top' | 'right' | 'bottom' | 'left' | 'center'} PlacementType
 * @typedef {PlacementType | [number, number]} Position
 *
 * @typedef {Object} StepConfig
 * @property {string} id - Unique step identifier
 * @property {string} selector - CSS selector for target element
 * @property {Position} [placement] - Popover position: 'top' | 'right' | 'bottom' | 'left' | 'center' | [x, y]
 * @property {string} [tips] - Step title
 * @property {string} [desc] - Step description
 * @property {string} [image] - Image URL
 * @property {string} [lottie] - Lottie animation URL
 */

/**
 * Create a hint step (manual next)
 * @param {StepConfig & { allowNext?: boolean }} config
 */
export function hintStep({ id, selector, placement, tips, desc, now, next, image, lottie, allowNext = true }) {
  return {
    id,
    selector,
    placement,
    tips: tips ?? now,
    desc: desc ?? next,
    now: tips ?? now,
    next: desc ?? next,
    image,
    lottie,
    mode: 'hint',
    allowNext,
    expect: () => false
  }
}

/**
 * Create an event step (auto-advance on event)
 * @param {StepConfig & { expect: (evt: any) => boolean }} config
 */
export function eventStep({ id, selector, placement, tips, desc, now, next, image, lottie, expect }) {
  return {
    id,
    selector,
    placement,
    tips: tips ?? now,
    desc: desc ?? next,
    now: tips ?? now,
    next: desc ?? next,
    image,
    lottie,
    mode: 'event',
    allowNext: false,
    expect
  }
}

export function normalizeDeviceType(value) {
  return value === 'classic1s' ? 'classic1s' : 'pro'
}

export function deviceLabel(deviceType, locale) {
  const type = normalizeDeviceType(deviceType)
  if (type === 'classic1s') return locale === 'en' ? 'OneKey Classic 1s' : 'OneKey Classic 1s'
  return locale === 'en' ? 'OneKey Pro' : 'OneKey Pro'
}
