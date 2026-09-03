# Agent 工作流维护

本文说明 Hardware JS SDK 中 AI Agent 指令、领域 Skill、长期文档和验证脚本之间的边界。
技术事实仍由代码、生成源和对应领域文档维护。

## 信息层级

| 层级         | 位置                             | 职责                                        |
| ------------ | -------------------------------- | ------------------------------------------- |
| 仓库硬约束   | `AGENTS.md`                      | 高频安全、架构、兼容、Git 和验证规则        |
| Claude 入口  | `CLAUDE.md`                      | 引用 `AGENTS.md`，避免维护第二份规则        |
| 长期技术事实 | `docs/`                          | 架构、协议、设备、SDK、业务、设计和测试事实 |
| 领域工作流   | `.skillshare/skills/*/SKILL.md`  | 按任务加载的步骤、路由和检查清单            |
| 机器约束     | `scripts/agent-context-check.js` | 结构、链接、触发策略和上下文预算            |
| 统一验证     | `scripts/agent-check.js`         | 提交前和 PR 前的代码与文档检查              |

规则只写在最接近其作用域的位置。根指令不复制完整协议说明，Skill 不复制长期文档，
验证脚本只固化可自动执行的约束。

## 当前 Skill

| Skill                         | 使用场景                                | 触发策略 |
| ----------------------------- | --------------------------------------- | -------- |
| `hardware-architecture`       | 包边界、Device 生命周期、公共兼容面     | 可隐式   |
| `hardware-transport-protocol` | USB/BLE、V1/V2、帧、超时、重连、Link    | 可隐式   |
| `hardware-error-handling`     | 错误码、映射、序列化、重试与恢复        | 可隐式   |
| `hardware-chain-integration`  | 地址派生、签名、链能力和测试向量        | 可隐式   |
| `hardware-dev-commands`       | 开发、构建、测试和验证命令              | 可隐式   |
| `hardware-change-plan`        | 实施计划、任务拆分和验证矩阵            | 可隐式   |
| `hardware-firmware-protobuf`  | firmware 子模块、protobuf 和生成物      | 仅显式   |
| `hardware-security-review`    | Session、PIN/Passphrase、签名和安全审查 | 仅显式   |
| `hardware-create-pr`          | 校验、提交、推送和创建 PR               | 仅显式   |
| `hardware-release`            | 版本、构建、发布和 release PR           | 仅显式   |

会移动子模块、产生外部状态、修改物理设备、发布包或执行安全审计的 Skill 必须保持
`allow_implicit_invocation: false`。

## 修改规则

### 修改根指令

只加入高频且违反后果明确的规则。详细背景链接到 `docs/`，领域步骤链接到 Skill。修改后
确认 `CLAUDE.md` 仍只引用根指令。

### 修改长期文档

优先更新已有主题。新增文档前确认它具有独立维护边界，并把入口加入 `docs/README.md`。
不要复制易变版本、枚举或远端分支状态；应指向代码、配置或生成源。

### 修改或新增 Skill

1. 用具体任务验证 Skill 的触发范围。
2. `SKILL.md` 只保留执行步骤，把事实链接到 `docs/`。
3. `name` 使用小写连字符并与目录一致。
4. `description` 同时说明能力和触发场景。
5. 在 `agents/openai.yaml` 中声明触发策略。
6. 更新本页的 Skill 表格。
7. 运行 Agent 上下文校验。

新的工作流直接创建或扩展 Skill，不新增独立命令模板。Skill 必须明确授权边界，不默认
发布、推送、auto-merge、固件安装、设备擦除或打开外部应用。

## 校验入口

```bash
# Agent 指令、Skill 元数据、相对链接和上下文预算
yarn lint:agent-context

# 当前改动和受影响 package
yarn agent:check --profile commit

# 全量 PR readiness
yarn agent:check --profile pr
```

`commit` profile 会检查工作区中已跟踪和未跟踪的 JavaScript/TypeScript 文件，并对变更
涉及的 package 运行其 test/build。已有但尚未纳入当前任务的文件也可能导致该 gate 失败；
报告时必须区分本次变更与用户原有改动，不得为了通过检查擅自修改无关文件。

`agent:check` 只在终端输出步骤、耗时、状态和日志路径。详细输出写入
`node_modules/.cache/agent-checks/<timestamp>/`；优先阅读对应日志，再使用底层命令定位。

协议或 protobuf 变更应优先按以下依赖顺序迭代：

```bash
yarn --cwd packages/hd-transport test --runInBand
yarn --cwd packages/hd-transport build
yarn --cwd packages/hd-transport-web-device build
yarn --cwd packages/hd-transport-react-native build
yarn --cwd packages/hd-common-connect-sdk build
yarn --cwd packages/core test --runInBand
yarn --cwd packages/core build
```

全仓 lint 内存消耗较高；排查失败时可使用：

```bash
NODE_OPTIONS=--max-old-space-size=8192 yarn lint --quiet
```

## 文档事实与历史资料

`docs/superpowers/` 保存既有阶段性设计和实施计划。引用其中内容前必须回到当前代码和
长期文档验证。若历史设计形成长期约束，应把结论更新到对应架构、协议、设备或 SDK
文档，而不是让业务代码长期依赖历史计划。
