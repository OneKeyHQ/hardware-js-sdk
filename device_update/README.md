# OneKey Pro 2 Update Tool

通过 WebUSB 升级 OneKey Pro 2 的 romloader、资源、蓝牙固件和主控固件。

## 1. 环境依赖

- **Python** ≥ 3.8
- **依赖库**：见 [requirements.txt](requirements.txt)

安装依赖：

```bash
pip install -r requirements.txt
```

> `workflow.py` 启动时会自检并按需自动安装缺失的依赖。

## 2. 前置条件：进入 romloader 模式

升级前需手动让设备进入 **romloader 模式**：

| romloader 版本 | 进入方式                          |
| -------------- | --------------------------------- |
| 旧 romloader   | 开机后**滑动屏幕上的红色方块**     |
| 新 romloader   | 开机后从**左上角滑动至右下角**     |

设备进入 romloader 模式后即可执行升级。

## 3. 升级步骤

完整升级流程分为 4 个步骤：

| Step  | 内容                              |
| ----- | --------------------------------- |
| step1 | 用新 romloader 替换旧 romloader   |
| step2 | 拷贝资源文件到设备                 |
| step3 | 升级蓝牙固件                       |
| step4 | 升级主控固件                       |

### 一键执行（推荐）

```bash
python3 workflow.py all
```

按 step1 → step2 → step3 → step4 顺序自动执行；step3/step4 失败后会自动重试一次。

### 单步执行（仅出错恢复时使用）

```bash
python3 workflow.py step2   # 仅执行 step2
python3 workflow.py step3   # 仅执行 step3
python3 workflow.py step4   # 仅执行 step4
```
>出错时可以按照 step2 → step3 → step4 手动执行

## 4. 手动恢复

如以上方式均无法完成升级，请使用 **WebUSB 工具** 按手册流程进行手动升级。
