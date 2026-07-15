# Pro 2 壁纸上传与设置链路修正设计

## 背景

当前 `deviceUploadWallpaper` 会先通过 `FilesystemFileWrite` 上传壁纸文件，再发送旧的 `SetWallpaper` 消息激活壁纸。Pro 2 当前固件的正式设置入口是 `DeviceSettingsSet.settings.wallpaper_path`，因此 SDK 应改为使用设备设置接口完成激活。

同时，`DeviceUploadWallpaper` 内部自行实现了一套文件分片上传循环，与公共 `fileWrite` 方法的分片、进度和设备回包处理重复。两套实现会增加行为漂移和维护成本。

## 目标

- 壁纸文件上传复用 `fileWrite` 使用的 Protocol V2 分片写入能力。
- 上传成功后通过 `DeviceSettingsSet.settings.wallpaper_path` 设置锁屏壁纸。
- `deviceUploadWallpaper` 的公共调用参数和主要返回字段保持兼容。
- 保留 `SetWallpaper` protobuf 定义，不扩大本次协议兼容性变更范围。
- 修正测试、文档和 Playground 中旧的 `SetWallpaper` 链路描述。

## 非目标

- 不删除 `SetWallpaper`、`GetWallpaper` 或 `Wallpaper` 的 protobuf 定义和消息编号。
- 不改变壁纸编码格式、604×1024 尺寸要求、文件名规则和目标目录。
- 不增加主屏幕壁纸能力；Pro 2 当前只设置锁屏壁纸。
- 不改变公共 `fileWrite` API 的参数或返回类型。

## 方案

### 共享文件写入能力

从 `packages/core/src/api/FileWrite.ts` 中提取内部可复用的 Protocol V2 文件写入函数。该函数接收已经标准化的写入参数和运行时依赖，负责：

- 将输入数据转换为 `Uint8Array`。
- 根据 BLE 或 WebUSB 环境限制标准化分片大小。
- 连续发送 `FilesystemFileWrite`。
- 正确设置首片的 `overwrite`、后续分片偏移和 `ui_percentage`。
- 使用设备返回的 `processed_byte` 推进写入位置。
- 拒绝越过数据末尾的异常 `processed_byte`。
- 保留超时、取消检查和进度通知行为。
- 返回最后一次文件回包以及已确认的写入信息。

公共 `FileWrite` 方法继续负责参数校验和 UI 事件适配，然后调用共享函数，因此其外部行为保持不变。

### 壁纸上传流程

`DeviceUploadWallpaper` 保留以下职责：

1. 校验图片尺寸、RGBA 数据、文件名和可选分片大小。
2. 编码为 LVGL v9 RGB565 或 RGB565A8 文件。
3. 创建 `vol0:/wallpapers/user` 目录；目录已存在时继续执行。
4. 调用共享文件写入函数上传编码后的完整文件。
5. 上传成功后发送：

   ```ts
   DeviceSettingsSet {
     settings: {
       wallpaper_path: uploadedPath
     }
   }
   ```

6. 返回上传路径、文件大小、颜色格式，以及 `DeviceSettingsSet` 返回的可选消息。

只有文件全部上传成功后才设置 `wallpaper_path`。上传失败或中断时不改变当前壁纸设置。

## 错误处理

- 目录创建失败且错误不是“目录已存在”时，立即终止。
- 任意文件分片写入失败时，立即终止，不发送 `DeviceSettingsSet`。
- `processed_byte` 非递增时，按当前分片长度推进，保持现有兼容行为。
- `processed_byte` 超过文件末尾时抛出运行时错误，不设置壁纸路径。
- `DeviceSettingsSet` 拒绝文件路径时，向调用方透传设备错误；已上传文件由设备端后续设置逻辑或文件管理流程处理。

## 兼容性

- `deviceUploadWallpaper` 方法名和输入参数不变。
- 返回对象继续包含 `path`、`size`、`colorFormat` 和可选 `message`。
- `fileWrite` 与 `filesystemFileWrite` 的公共行为保持一致。
- `SetWallpaper` 消息定义继续存在，但 `deviceUploadWallpaper` 不再调用它。
- `wallpaper_path: ""` 恢复默认壁纸的能力由现有 `deviceSettingsSet` API 提供，本次不新增单独的重置方法。

## 测试策略

采用测试驱动方式实施：

1. 先修改壁纸上传测试，使其期望最后发送 `DeviceSettingsSet` 和 `settings.wallpaper_path`，并断言没有发送 `SetWallpaper`；修改后测试应先失败。
2. 为共享文件写入函数补充测试，覆盖多分片偏移、首片覆盖标记、`processed_byte` 推进、异常越界和进度行为。
3. 实现共享函数并让公共 `FileWrite` 和 `DeviceUploadWallpaper` 共同使用。
4. 运行壁纸、Protocol V2 文件写入和类型检查相关测试。
5. 运行完整的 core 测试或项目允许的等价回归命令，确认没有破坏其他 Protocol V2 文件操作。

## 文档与示例同步

更新仍描述旧链路的文档和 Playground 调试信息：

- 将 `FilesystemDirMake + FilesystemFileWrite + SetWallpaper` 改为 `FilesystemDirMake + FilesystemFileWrite + DeviceSettingsSet(wallpaper_path)`。
- 明确设置路径和恢复默认壁纸均通过 `deviceSettingsSet` 完成。
- 不修改归档规格中的历史记录，除非该文件仍作为当前用户文档被引用。

## 验收标准

- `deviceUploadWallpaper` 不发送 `SetWallpaper`。
- 壁纸上传使用与公共 `fileWrite` 相同的底层分片写入实现。
- 文件成功上传后发送 `DeviceSettingsSet.settings.wallpaper_path`。
- 文件上传失败时不发送 `DeviceSettingsSet`。
- 公共 `fileWrite` API 的现有测试和类型检查通过。
- 当前用户文档和 Playground 不再宣称 Pro 2 使用 `SetWallpaper` 激活壁纸。
