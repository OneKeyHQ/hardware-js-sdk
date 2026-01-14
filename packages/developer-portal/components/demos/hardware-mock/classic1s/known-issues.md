# Classic 1s Mock Demo 展示逻辑（规则与问题点）

这份文档以“Mock Demo 的目标交互规则”为准：先明确**正确规则**，再对照当前实现列出**不一致点**（也就是需要修复的地方）。

适用范围（核心文件）：

- `components/demos/hardware-mock/HardwareMockDemo.jsx`（页面容器、Classic 1s PIN 弹窗与模式切换）
- `components/demos/hardware-mock/classic1s/Classic1sDeviceScreen.jsx`（Classic 1s 设备屏幕渲染与四按键交互）
- `components/demos/hardware-mock/createHardwareMockMachine.js`（XState 状态机）
- `components/demos/hardware-mock/mockHardwareServer.js`（内存 Mock：UI_REQUEST / UI_RESPONSE）
- 相关文档：
  - `content/zh/hardware-sdk/mock-demo.mdx`
  - `content/en/hardware-sdk/mock-demo.mdx`

---

## 0. 正确规则（以需求为准）

1. **作为 Mock：PIN 不做校验**。用户输入任意 **4 位 PIN** 即可提交并继续流程。
2. **Classic 1s 有两种解锁方式**：
   - 方式 A：直接在 Mock 界面输入 PIN（不依赖矩阵映射）。
   - 方式 B：通过弹窗 + Classic 1s 屏幕的随机 PIN 矩阵对照后输入 PIN（用于模拟“盲输/映射输入”）。
3. **Classic 1s 设备侧只有四个按钮**（`power`/`up`/`down`/`enter`），所有设备侧交互只使用这四个按钮，不新增其他设备按钮。
4. **PIN 矩阵规则正确**：`0~9` 共 `10` 位，UI 呈现为“`3×3 + 底部中间 1 位`”。

---

## 1. 当前实现概览（便于定位）

### 1.1 两种 PIN 输入模式在代码中的体现

- **设备输入模式（方式 A）**：`Classic1sDeviceScreen.jsx` 的 `pinEntryOnDevice=true` 分支。
  - 使用四个按键完成输入：`up/down` 选择数字、`enter` 确认一位、`power` 退格。
  - 输入满 4 位后会触发 `onSubmitPin(pin)` 提交。
- **弹窗映射输入（方式 B）**：`HardwareMockDemo.jsx` 在 `classicPinModalOpen=true` 时渲染的弹窗。
  - 设备屏幕显示“随机 PIN 矩阵数字”（`Classic1sDeviceScreen.jsx` 的 `PinMatrixLayoutScreen`）。
  - 弹窗显示“点阵位置”，点击位置后通过 `classicPinMatrix[positionIndex]` 映射成具体数字并拼出 PIN。

### 1.2 PIN 矩阵的生成与映射

- `HardwareMockDemo.jsx` 的 `classicPinMatrix` 由 `buildClassicPinLayout(String(ui.requestId))` 生成。
- 该矩阵用于：
  - 设备屏幕展示数字布局；
  - 弹窗点阵点击时，将“位置”映射为“数字”。

---

## 2. 对齐结果（当前实现）

- ✅ Mock PIN 不校验：任意 4 位 PIN 提交即可继续流程（`components/demos/hardware-mock/mockHardwareServer.js`）。
- ✅ 文档与导览不再强调“默认 PIN”，统一描述为“任意 4 位 PIN 均可”（`content/*/hardware-sdk/mock-demo.mdx`、`components/demos/hardware-mock/tour/HardwareMockTour.jsx`）。
- ✅ Classic 1s 设备侧交互仅使用四按键（`power`/`up`/`down`/`enter`），不引入额外设备按钮（`components/demos/hardware-mock/classic1s/Classic1sDeviceScreen.jsx`）。
- ✅ PIN 矩阵为 `0~9` 共 `10` 位，布局为“`3×3 + 底部中间 1 位`”，弹窗点阵与设备布局一一映射（`components/demos/hardware-mock/HardwareMockDemo.jsx`、`components/demos/hardware-mock/classic1s/Classic1sDeviceScreen.jsx`）。
