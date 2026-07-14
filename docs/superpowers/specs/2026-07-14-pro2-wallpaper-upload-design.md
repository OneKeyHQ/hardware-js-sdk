# Pro2 壁纸上传设计

## 背景

Protocol V1 的 Pro/Touch 使用独立的 `deviceUploadResource` 接口上传壁纸，设备协议负责接收主图、缩略图和模糊图。Pro2 的 Protocol V2 不再提供这一资源上传协议，而是要求宿主侧先把图片转换为 LVGL v9 图片二进制，再通过文件系统写入 `vol0:/wallpapers/user/`，最后使用 `DeviceSettingsSet.wallpaper_path` 选择该文件。

Pro2 固件资源工具的当前配置为：

- 目标尺寸：604 × 1024；
- LVGL v9 二进制头，magic 为 `0x19`；
- 无透明像素使用 `RGB565`；
- 存在透明像素使用 `RGB565A8`；
- stride 按 4 字节对齐；
- RGB565 启用抖动；
- 不压缩；
- 固件仅接受 `vol0:/wallpapers/user/` 下可被 LVGL 解码器打开的文件。

## 目标

1. SDK 新增 Pro2 专用的高层 `deviceUploadWallpaper` API。
2. SDK 复用 Protocol V2 文件系统与设置接口，封装完整上传流程。
3. SDK 提供不依赖 DOM 的 RGBA → LVGL v9 bin 编码器。
4. Expo Playground 的 Pro2 Debug 页面支持选择 PNG、JPEG/JPG 和 WebP，预览、转换并上传。
5. 上传操作复用 Protocol V2 的 `retry-on-locked` 策略：只有设备返回 `Device locked` 时才解锁并重试。

## 非目标

- 不修改 Pro2 固件或 protobuf。
- 不复用 Protocol V1 的 `ResourceUpload/ResourceAck`。
- 不在 SDK core 中引入浏览器 Canvas、React Native 图片库或原生图片解码依赖。
- 首版不支持 SVG；SVG 可能包含脚本、外部资源和不同渲染实现，不适合作为稳定输入格式。
- 首版不承诺动画 GIF；若浏览器能够解码，也只允许显式取首帧，Playground 默认不展示为支持格式。
- 不提供设备端 PNG/JPEG 解码，因为当前固件没有对应运行时能力。

## 方案对比

### 方案 A：SDK 接收通用图片文件并自行解码

优点是调用最简单。缺点是 SDK 同时运行于 Web、React Native 和 Node，三者没有统一图片解码 API；引入完整 PNG/JPEG/WebP 解码器会明显增加 core 体积，并重复平台已有能力。

### 方案 B：Playground 直接转换并调用底层文件接口

实现快，但业务规则散落在示例应用中，正式调用方必须重复目录、文件名、LVGL 编码、分块上传和设置路径逻辑，无法形成稳定 SDK 能力。

### 方案 C：平台负责解码，SDK 负责编码和设备编排（采用）

平台适配器把通用图片转换为固定尺寸 RGBA；SDK 使用纯 TypeScript 编码为 LVGL bin，并完成文件上传和设置。它兼顾 SDK 能力复用、跨平台和包体积，是当前最稳妥的边界。

## 公共 API

新增 API：

```ts
type DeviceUploadWallpaperParams = {
  width: 604;
  height: 1024;
  rgba: Uint8Array | ArrayBuffer;
  fileName?: string;
  chunkSize?: number;
};

type DeviceUploadWallpaperResponse = {
  path: string;
  size: number;
  colorFormat: 'RGB565' | 'RGB565A8';
  message?: string;
};

deviceUploadWallpaper(
  connectId: string,
  params: DeviceUploadWallpaperParams
): Response<DeviceUploadWallpaperResponse>;
```

首版要求输入已经是 604 × 1024 的 RGBA8888，且数据长度严格等于 `604 * 1024 * 4`。固定尺寸写入类型是为了让错误尽早暴露；运行时仍会进行完整校验。

SDK 同时导出纯函数：

```ts
encodePro2Wallpaper(options: {
  width: 604;
  height: 1024;
  rgba: Uint8Array | ArrayBuffer;
}): {
  data: Uint8Array;
  colorFormat: 'RGB565' | 'RGB565A8';
};
```

该函数便于单元测试、预估上传大小和其他平台复用。它不负责解码 PNG/JPEG/WebP，也不读取文件。

## LVGL 编码规则

编码结果必须与 firmware-pro2 中 vendored `LVGLImage.py` 的 AUTO 模式一致：

1. 扫描 alpha 通道；所有像素 alpha 都为 255 时选择 `RGB565`，否则选择 `RGB565A8`。
2. RGB565 按 LVGL 工具的字节顺序写入，并使用与固件资源配置一致的 RGB565 抖动算法。
3. RGB565 主平面每行 stride 为 `604 * 2 = 1208`，已经满足 4 字节对齐。
4. RGB565A8 先写完整 RGB565 主平面，再写 A8 alpha 平面；alpha stride 为 RGB stride 的一半，即 604。
5. 写入 12 字节 LVGL v9 header：magic、color format、flags、width、height、stride 均使用与工具一致的位宽和小端编码。
6. 不压缩，不预乘 alpha。

实现时以固件仓库当前 `LVGLImage.py` 和 `image_generate.py` 生成的 fixture 为黄金样本，避免仅根据文档重新猜测格式。

## SDK 上传流程

`deviceUploadWallpaper` 仅支持 Protocol V2：

1. 校验尺寸、RGBA 长度、文件名和可选 chunkSize。
2. 调用 `encodePro2Wallpaper` 生成 LVGL bin。
3. 对文件名做安全化：只允许字母、数字、短横线和下划线；统一补 `.bin`。未提供时使用内容哈希生成稳定名称，例如 `wallpaper-<hash>.bin`。
4. 确保 `vol0:/wallpapers/user` 目录存在。目录已存在视为成功。
5. 调用现有 `fileWrite`/`FilesystemFileWrite` 能力，以 overwrite 模式分块写入完整 bin。
6. 调用 `deviceSettingsSet({ settings: { wallpaper_path: path } })` 应用壁纸。
7. 返回最终路径、bin 大小、颜色格式和设置结果。

高层方法通过内部上传编排 helper 复用文件系统的分块、超时和响应校验规则，不从 core 内部递归调用公开 SDK API。方法实例保存 `encoded`、`directoryReady` 和 `uploaded` 三个检查点；若统一解锁策略重新执行 `run()`，已经完成的阶段会被跳过，只重试产生 locked 错误的后续阶段。

如果文件写入成功但设置失败，SDK 保留文件并返回原始错误，不自动删除。这样可以安全重试设置步骤，也避免解锁或链路中断后重复上传大文件。固件在设置成功后会清理其他用户壁纸文件。

## 解锁与错误处理

- 高层方法不读取 `features.unlocked`，也不做预解锁。
- 文件写入和设置调用若返回 `Failure_ProcessError / subcode 9 / Device locked`，沿用统一 `retry-on-locked` 机制：保存方法实例、执行 `deviceUnlock`、方法仅重试一次；高层方法依靠阶段检查点避免重复执行已经成功的上传。
- 图片尺寸或 RGBA 长度错误在发送设备请求前失败。
- 文件名包含路径分隔符、`.`/`..` 路径片段或非法字符时失败，防止越过用户壁纸目录。
- LVGL 编码结果超过 SDK/协议允许范围时失败，并报告实际字节数。
- Playground 对浏览器无法解码的文件给出“图片格式不支持或文件损坏”，不进入 SDK 上传流程。

## Expo Playground

在 Pro2 Debug 的 Settings 分组中新增 `Upload Wallpaper`，而不是把二进制内容塞入通用 JSON 参数编辑器。

交互流程：

1. 文件选择器接受 `image/png,image/jpeg,image/webp`。
2. 使用 `createImageBitmap` 优先解码；不支持时回退到 `HTMLImageElement + object URL`。
3. Canvas 以 `cover` 规则居中裁剪到 604 × 1024，不拉伸变形。
4. 展示裁剪后的预览、原始尺寸、输入 MIME、是否含透明通道和预计 bin 大小。
5. 用户点击上传后，从 Canvas 读取 RGBA 并调用 `deviceUploadWallpaper`。
6. 展示转换、上传、设置三个阶段的状态；成功后显示设备路径和编码格式。

PNG、JPEG/JPG、WebP 的支持依赖当前浏览器实际解码能力。JPEG 没有透明通道，通常编码为 RGB565；PNG/WebP 是否使用 RGB565A8 由像素 alpha 扫描决定，而不是仅根据扩展名判断。

## 测试策略

### 编码器单元测试

- 12 字节 header 与固件黄金样本一致；
- 纯不透明 RGBA 选择 RGB565；
- 任意非 255 alpha 选择 RGB565A8；
- RGB565 像素字节顺序、stride、alpha 平面布局正确；
- 固定小图测试抖动结果，再用 604 × 1024 fixture 验证完整输出 hash；
- 输入尺寸和字节数不匹配时拒绝。

### SDK 方法测试

- 非 Protocol V2 设备被拒绝；
- 自动创建用户壁纸目录；
- 目录已存在时继续上传；
- fileWrite 使用 overwrite、正确 total size 和 path；
- 上传完成后设置 `wallpaper_path`；
- 文件名被规范化且不能路径穿越；
- 设置失败时保留已上传文件并透传错误；
- Device locked 触发统一解锁后重试一次。

### Playground 测试

- cover 裁剪计算覆盖横图、竖图和目标比例图片；
- PNG/JPEG/WebP MIME 校验；
- Canvas 解码失败展示可理解错误；
- 选择文件后可预览并调用 SDK；
- TypeScript 类型检查和生产构建通过。

### 真机验证

使用 Pro2 Debug：

1. 分别上传 JPEG、无透明 PNG、有透明 PNG、WebP；
2. 验证设备可立即显示壁纸，重启后仍可读取；
3. 锁屏状态发起上传或设置，验证只在设备报 locked 后触发解锁；
4. 通过 USB 和 BLE 各验证一次，重点观察大文件分块写入的耗时和稳定性；
5. 上传第二张壁纸后检查当前路径正确，并确认固件完成旧用户壁纸清理。

## 兼容性与演进

- Protocol V1 的 `deviceUploadResource` 保持不变。
- Pro2 使用新的 `deviceUploadWallpaper`，调用方不需要了解文件系统目录或 `wallpaper_path`。
- 后续 React Native 可以新增平台图片适配器，将系统图片 URI 解码/缩放为 RGBA，再复用同一 SDK API；不需要修改协议层或 LVGL 编码器。
- 若未来固件支持直接解码 PNG/JPEG，可在高层方法内部新增能力协商，但当前 API 的 RGBA 输入仍可保持兼容。
