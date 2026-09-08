<div align="right">

[English](./README.md) · **简体中文**

</div>

# Lite Modify Headers

在 Chrome 里改写 HTTP **请求头**和**响应头** —— 一张表，零配置。

填一行、打开开关，就完事了。无需账号，没有服务端，不上报任何数据 —— 规则只存在你的浏览器里。

![配置页](./docs/images/options-overview.png)

## 为什么好用

- **一张表就是整个应用。** 所有东西都在一个页面上：一条规则一行，六个短字段，没有向导，没有层层菜单。
- **没有保存按钮。** 边打字边生效、边存储。你看到的就是浏览器正在做的。
- **一个开关管全部。** 切换 _Running / Paused_，所有规则一起停或一起恢复 —— 关闭期间规则仍然保留，不会丢。
- **上手不需要学。** 头名称、值、作用于哪些 URL。URL 留空就是对所有网站生效。
- **随时看得出有没有在工作。** 规则生效期间工具栏图标变绿，状态栏还会显示真正注册成功了几条。
- **需要进阶时它也够用。** 三种动作（`Set` / `Delete` / `Block`）、正则 URL 过滤、从上到下的优先级，以及用来管理成套头的分组。

## 安装

### 从 Chrome 应用商店安装（推荐）

<!-- TODO: 替换为 Chrome 应用商店的地址 -->

**[前往 Chrome 应用商店安装](#)** —— 自动更新，也不需要开发者模式。

### 从源码本地安装

适合跑未发布的版本、或者要改代码。本地加载的扩展需要**开发者模式**一直开着，且不会自动更新。

```sh
npm install
npm run build
```

打开 `chrome://extensions`，开启**开发者模式**，点击**加载已解压的扩展程序**，选择 **`dist/`** 目录（不是仓库根目录）。

## 使用方法

### 1. 点击工具栏图标

弹窗就是开关：一键切换全部规则、单独开关某条，或者跳到配置页。

![工具栏弹窗](./docs/images/popup.png)

### 2. 添加规则

在配置页点击 **+ Add rule**，把这一行填好：

| 列           | 含义                                              |
| ------------ | ------------------------------------------------- |
| `ON`         | 规则是否启用。关闭的规则不会注册到浏览器。        |
| `TYPE`       | `REQ` 作用于请求头，`RES` 作用于响应头。          |
| `ACTION`     | `Set` 写入头，`Delete` 删除头，`Block` 拦截请求。 |
| `HEADER`     | 头字段名。`Block` 不需要。                        |
| `VALUE`      | 头字段值。只有 `Set` 会用到。                     |
| `URL FILTER` | 规则作用于哪些 URL。留空表示所有 URL。            |

不用保存。信息填完整规则就立刻开始工作 —— `Set` 需要头名称，`Block` 需要 URL 过滤条件。

### 3. 启用

切换页面标题栏或弹窗里的开关。规则生效期间工具栏图标会变绿。

### 用分组管理成套的头

多个头属于同一件事时（例如某个 API 域名的一整套 CORS 响应头），点击 **+ Add group**。分组统一持有**名称**和 **URL 过滤条件**，组内每个头只保留自己的类型、动作、名称和值；关掉分组，组内所有头一起失效。

## URL 过滤

- **留空**表示对所有 URL 生效。
- 普通文本按 URL 的**子串**匹配，例如 `example.com/api`。
- 用斜杠包裹表示**正则表达式**，例如 `/api\/v[12]\//`。
- `Block` 规则**必须**填过滤条件 —— 否则会拦截一切请求，因此会被忽略。

过滤条件遵循 [declarativeNetRequest 匹配语法](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#matching-algorithm)。浏览器对注册规则的数量和正则表达式的长度有上限；超出时会提示你关闭一些规则。

## 优先级

规则从上到下生效 —— 先改到某个头的规则赢。用箭头调整顺序。一个分组在它所处的位置上，会占掉与其头数量相同的槽位。

## 示例

| 目标                          | 类型  | 动作     | 头                            | 值                 | URL 过滤               |
| ----------------------------- | ----- | -------- | ----------------------------- | ------------------ | ---------------------- |
| 给测试环境 API 带上固定 token | `REQ` | `Set`    | `Authorization`               | `Bearer dev-token` | `staging.example.com`  |
| 伪装 User-Agent               | `REQ` | `Set`    | `User-Agent`                  | `MyBot/1.0`        | `example.com`          |
| 全站去掉 Referer              | `REQ` | `Delete` | `Referer`                     |                    |                        |
| 本地开发放开 CORS             | `RES` | `Set`    | `Access-Control-Allow-Origin` | `*`                | `/^https:\/\/api\./`   |
| 拦掉某个埋点域名              | `REQ` | `Block`  |                               |                    | `tracking.example.com` |

## 隐私

配置存在 `chrome.storage.local`，不会离开浏览器。扩展不收集任何个人信息，也不与任何服务端通信。旧的 1.x 格式配置会在首次加载时自动迁移。

## 能力边界

Manifest V3 取消了直接读写头的能力，本扩展完全构建在 `declarativeNetRequest` 之上。由此带来几条有意为之的限制：

- **只支持 Chromium**（Chrome、Edge）。不支持 Firefox 和 Manifest V2。
- **不能逐条改 cookie。** `declarativeNetRequest` 无法修改 `Cookie` / `Set-Cookie` 里的单个 cookie，只能整体设置或删除。
- **只有一个 `Set`，不区分 add / modify。** 设置一个不存在的头就等于创建它，区分没有意义。
- **不做导入导出。** 刻意保持界面精简。

## 权限说明

- `storage`：存储配置和规则。
- `activeTab`、`tabs`：在浏览器标签页里打开配置页。
- `declarativeNetRequest`、`declarativeNetRequestWithHostAccess`、`*://*/*`：应用规则表。

## 开发

技术栈、目录职责、配置格式以及容易踩的点见 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)（英文）。

## 致谢

用 Vite、React、TypeScript 独立编写，灵感来自 [SimpleModifyHeaders](https://github.com/didierfred/SimpleModifyHeaders)（MPL-2.0）。未使用该项目的任何源码。

## 许可

MIT。
