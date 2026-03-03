# Developer Portal AI 对话弹窗接入说明

本文档说明 `developer-portal` 中 AI 对话弹窗（assistant-ui）的启用方式。

## 1. 设计与约束

- 前端 UI：`assistant-ui`（浮动按钮 + 弹窗），接近 Inkeep 的交互方式。
- 文档站构建方式：`next export` 静态导出，因此不依赖 Next API Route。
- 请求方式：前端直接请求你们自己的对话服务端点（可在后端转发到 Context7、模型网关或自建 RAG）。

## 2. 环境变量

在部署或本地运行时设置以下变量：

| 变量名                                  | 必填 | 说明                                                  |
| --------------------------------------- | ---- | ----------------------------------------------------- |
| `NEXT_PUBLIC_DOCS_AI_API_URL`           | 是   | AI 服务地址（支持完整 URL，或以 `/` 开头的相对路径）  |
| `NEXT_PUBLIC_DOCS_AI_ENABLED`           | 否   | 是否启用弹窗，默认启用；设为 `false` 或 `0` 时关闭    |
| `NEXT_PUBLIC_DOCS_AI_LIBRARY_ID`        | 否   | 传给后端的文档库 ID，默认 `/onekeyhq/hardware-js-sdk` |
| `NEXT_PUBLIC_DOCS_AI_AUTH_HEADER_NAME`  | 否   | 额外鉴权 Header 名（前端可见，仅适合公开凭证）        |
| `NEXT_PUBLIC_DOCS_AI_AUTH_HEADER_VALUE` | 否   | 额外鉴权 Header 值                                    |

> 安全建议：私密密钥不要放在 `NEXT_PUBLIC_*` 环境变量中，请在你们后端安全保存。

## 3. 前端发送的额外上下文

除了 AI SDK 标准消息体，前端会附加以下字段到 `body`：

- `libraryId`
- `pathname`
- `lang`
- `source`（固定为 `hardware-js-sdk-docs`）

后端可用这些字段做：

- 文档路由感知召回（按 `pathname` 提升相关段落）
- 多语言检索路由（按 `lang`）
- 多项目共享网关分流（按 `libraryId`、`source`）

## 4. 本地联调（推荐）

本仓库已提供一个本地 Context7 网关：

- 脚本：`scripts/context7-chat-gateway.mjs`
- 默认地址：`http://localhost:8787/api/chat`
- 默认模式：`auto`（优先 `/api/v2/chat`，失败自动降级到 `/api/v2/context`）

### 4.1 启动本地网关

在仓库根目录执行：

```bash
yarn dev:docs:ai-gateway
```

可选环境变量：

| 变量名                   | 必填 | 说明                                                                    |
| ------------------------ | ---- | ----------------------------------------------------------------------- |
| `PORT`                   | 否   | 网关端口，默认 `8787`                                                   |
| `CONTEXT7_GATEWAY_MODE`  | 否   | `auto` / `chat` / `context`，默认 `auto`                                |
| `CONTEXT7_LIBRARY_ID`    | 否   | 默认库 ID；未设置时优先读取仓库根目录 `context7.json`                  |
| `CONTEXT7_API_KEY`       | 否   | Context7 Bearer Key（可提升稳定性/额度）                               |
| `CONTEXT7_CHAT_ENDPOINT` | 否   | Chat 接口地址，默认 `https://context7.com/api/v2/chat`                 |
| `CONTEXT7_CONTEXT_ENDPOINT` | 否 | Context 接口地址，默认 `https://context7.com/api/v2/context`           |

> 说明：仓库里的 `context7.json` 包含 `public_key`（公开键），不是后端私密凭证。

### 4.2 启动文档站并接入网关

在另一个终端执行（当前环境建议用 webpack 模式）：

```bash
NEXT_PUBLIC_DOCS_AI_API_URL=http://localhost:8787/api/chat NEXT_PUBLIC_DOCS_AI_LIBRARY_ID=/onekeyhq/hardware-js-sdk yarn dev:docs:webpack
```

启动后访问：`http://localhost:3001/en/`

## 5. 线上/自建网关示例

```bash
NEXT_PUBLIC_DOCS_AI_API_URL=https://your-ai-gateway.example.com/api/chat NEXT_PUBLIC_DOCS_AI_LIBRARY_ID=/onekeyhq/hardware-js-sdk yarn dev
```

## 6. 代码位置

- 组件：`components/DocAIChatWidget.client.jsx`
- 注入位置：`app/[lang]/layout.jsx`
- 样式：`styles/globals.css`
- 样式依赖导入：`app/layout.jsx`
- 本地网关：`scripts/context7-chat-gateway.mjs`
