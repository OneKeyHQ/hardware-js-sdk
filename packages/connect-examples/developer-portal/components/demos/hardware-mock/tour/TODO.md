# Hardware Mock Tour 改造 TODO（已完成）

本文档最初用于“先对齐目标与改造范围”。目前相关改造已落地，本文件更新为**变更记录 + 维护清单**，方便后续迭代时快速定位。

涉及目录：`components/demos/hardware-mock/tour`

---

## 已确认规则（需求定稿）

1. **Tour 推进方式：保留事件驱动**（用户操作发生后，Tour 自动推进；`Next` 仅作为手动推进/跳过等待）。
2. 在 `command.sent` 事件里**直接带 `deviceType`**，用于生成正确分流的 steps。
3. 改成**纯前端内存 Mock**（不走 fetch，不需要 Service Worker / MSW）。

---

## 已完成项（✅）

### A. Tour 弹窗交互（`components/demos/hardware-mock/tour/HardwareMockTour.jsx`）

- ✅ 弹窗底部仅保留 `Next` / `Close` 两个按钮，并固定在底部。
- ✅ steps 按 `deviceType` 分流：Pro 与 Classic 1s 文案/动作指引互不混用。
- ✅ “事件驱动推进”：
  - `ui.shown(pin)` → 引导输入 PIN
  - `ui.shown(confirm)` → 引导设备确认
  - `command.result` → 自动聚焦结果
- ✅ tab 聚焦策略：仅 `example-code` / `callback-code` / `result-panel` 触发 tab 切换；设备屏幕不强行切 tab，避免“指向 A 却切到 B”。

### B. Tour 事件与锚点（`components/demos/hardware-mock/HardwareMockDemo.jsx`）

- ✅ `command.sent` payload 携带 `deviceType`。
- ✅ Classic 1s PIN 弹窗新增锚点：`data-tour="classic-pin-modal"`。

### C. 移除 MSW / Service Worker（全局）

- ✅ 内存 Mock：`components/demos/hardware-mock/mockHardwareServer.js`
- ✅ 客户端改为直接调用内存 server：`components/demos/hardware-mock/mockHardwareClient.js`
- ✅ 移除 MSW/SW 相关文件与依赖：`public/mockServiceWorker.js`、`package.json` 的 `msw` 依赖与配置等。

---

## 当前可用的 data-tour 锚点（供后续加步骤时复用）

- `send-button`
- `device-screen`
- `classic-pin-modal`
- `example-code`
- `callback-code`
- `result-panel`

---

## 可选的后续优化（非本次必须）

- [ ] 为 `command-select`、`showOnOneKey` 开关等补充更细粒度锚点，使 Tour 指向更精准。
- [ ] 给 `searchDevices` 增加 `wait-result → result` 的事件推进（目前偏讲解型）。
- [ ] 扩展更多命令的交互导览（目前聚焦 `btcGetAddress` / `btcSignMessage`）。
