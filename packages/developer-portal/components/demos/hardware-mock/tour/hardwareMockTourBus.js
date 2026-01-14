// 轻量事件总线：用于把“按钮点击/设备确认”等交互转成可被导览层消费的事件。
// 设计目标：零依赖、可在 React/Next.js 客户端安全使用。

export const hardwareMockTourBus = (() => {
  /** @type {Map<string, Set<(payload: any) => void>>} */
  const listeners = new Map()

  function on(type, handler) {
    const set = listeners.get(type) ?? new Set()
    set.add(handler)
    listeners.set(type, set)
    return () => {
      const current = listeners.get(type)
      if (!current) return
      current.delete(handler)
      if (current.size === 0) listeners.delete(type)
    }
  }

  function emit(type, payload) {
    const set = listeners.get(type)
    if (!set || set.size === 0) return
    for (const handler of set) {
      try {
        handler(payload)
      } catch {
        // 忽略单个订阅者异常，避免影响主流程
      }
    }
  }

  return { on, emit }
})()

