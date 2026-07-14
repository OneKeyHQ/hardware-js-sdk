# Pro2 壁纸上传

## 1. 公共接口

```ts
deviceUploadWallpaper(connectId, {
  width: 604,
  height: 1024,
  rgba,
  fileName?,
  chunkSize?,
})
```

返回：

```ts
{
  path: string;
  size: number;
  colorFormat: 'RGB565' | 'RGB565A8';
  message?: string;
}
```

## 2. 完整链路

1. 校验图片必须为 `604 x 1024`，输入长度必须等于 `width * height * 4`。
2. 检查 alpha；完全不透明编码为 `RGB565`，存在透明像素则编码为 `RGB565A8`。
3. 使用 8x8 阈值矩阵进行有序抖动，生成 Pro2 可读取的二进制头和像素数据。
4. 创建 `vol0:/wallpapers/user`；目录已存在时视为成功。
5. 通过 `FilesystemFileWrite` 分片上传，首片 `overwrite=true`。
6. 根据固件返回的 `processed_byte` 推进 offset，不能推进时才按本地 chunk 长度计算。
7. 调用 `SetWallpaper`，传入 `WallpaperTarget.Lock` 和上传路径，激活锁屏壁纸。

## 3. 分片策略

- 默认 chunk 大小按当前环境选择 BLE 或 WebUSB 的 V2 文件分片常量。
- 用户指定的 `chunkSize` 不得超过传输默认上限，且最终至少为 64 字节。
- 单个文件写请求取消默认响应超时，避免大文件传输被普通业务超时截断。

## 4. 文件名策略

- 允许字母、数字、下划线、连字符和可选 `.bin` 后缀。
- 未提供名称时，使用编码后二进制的 BLAKE2s 哈希前 12 位生成稳定文件名。
- 最终路径固定在用户壁纸目录，避免调用方传入任意设备路径。

## 5. 协议依据

- 当前流程上传完成后直接切换壁纸，没有失败时删除半成品文件的回滚。
- 同名文件首片覆盖；上传中断可能留下不完整文件。
- 固件 proto 明确规定：文件先通过 `FilesystemFileWrite` 上传，随后由 `SetWallpaper` 记录指定屏幕的活动路径；空路径用于恢复内置默认壁纸。

## 6. 关键代码

- `packages/core/src/api/protocol-v2/DeviceUploadWallpaper.ts`
- `packages/core/src/utils/pro2Wallpaper.ts`
- `packages/core/src/api/FileWrite.ts`
