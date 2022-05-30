
## Install

```bash
yarn && yarn bootstrap
```

## Usage Example Project

- 编译各个packages


```bash
yarn build
```

- 启动 hd-web-sdk


```bash
cd packages/hd-web-sdk && yarn dev
```

- 启动 Example 项目


```bash
cd packages/connect-examples/browser && yarn start

```

有报错的话尝试在 browser 目录下执行 `yarn` 。

hd-web-sdk 的 iframe 页面以及 example 项目是在 https 页面启动，如果遇到加载失败，访问对应页面键盘输入 `this is unsafe`。
