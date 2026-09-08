# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目性质

Chromium（Chrome / Edge）浏览器扩展，Manifest V3，根据规则表改写 HTTP 请求/响应头。

技术栈：**Vite + @crxjs/vite-plugin + React 19 + TypeScript + Tailwind CSS v4**。`manifest.json` 是 crxjs 的构建入口，产物在 `dist/`（已 gitignore）。

**不支持 Firefox / MV2**，1.9.0 之后已移除 `background.js`、`manifestV2.json` 和 webRequest 路径。

## 常用命令

- **`npm run dev`**：启动 Vite，产出带 HMR 的 `dist/`。改 React 组件浏览器里即时刷新，改 `manifest.json` / service worker 需要在扩展页手动 reload。
- **`npm run build`**：先 `tsc --noEmit` 再 `vite build`，类型错误会直接阻断构建。
- **`npm test`**：Vitest 跑 `src/lib/config.test.ts`（31 条）。`npm run test:watch` 是 watch 模式。
- **加载调试**：`chrome://extensions` → 开发者模式 → “加载已解压的扩展程序” 指向 **`dist/`**（不是仓库根目录）。
- **格式化**：`npm run format`（4 空格、单引号、无 trailing comma、printWidth 120）。

### 自动化验证扩展要用 Chrome for Testing

正式版 Google Chrome 已**禁用 `--load-extension`**（日志里会出现 `--load-extension is not allowed in Google Chrome, ignoring.`），puppeteer 指向 `/Applications/Google Chrome.app` 会静默加载不上。要驱动扩展做端到端验证，得用 Chrome for Testing（`~/.cache/puppeteer/chrome/mac_arm-*/`）或 Edge。

## 架构

只有一条改写路径：配置 → declarativeNetRequest 动态规则。

- **`src/lib/config.ts`** 是纯逻辑层：类型定义、配置模型（`getDefaultConfig` / `createEmptyRule`）、1.x → 2.0 迁移（`migrateConfig`）、规则转换（`convertRulesToDynamicRules`）。**不碰任何 chrome API、不碰 DOM**，所以能直接被 Vitest 测。**改配置结构就是改这个文件。**
- **`src/lib/chrome.ts`** 是副作用层：storage 读写、图标、dNR 注册（`applyConfig`）。全部 Promise 化，可以 await。同时被配置页、popup 和 service worker 共用，**所以不能假设 window / DOM 存在**——错误通过返回值上报（`applyConfig` 返回错误字符串或 `null`），而不是 `alert`。
- **`src/config/`** 是配置页（`options_ui`，`open_in_tab: true`）。状态全在 `useConfig.ts` 这个 hook 里，`config.rules` 是唯一状态源；每次编辑都 `commit()`（存储 + 重新注册），**没有保存按钮**。
- **`src/menu/`** 是工具栏弹窗，只有 Start/Stop 和打开配置页。
- **`src/service-worker.ts`** 只在 `onStartup` / `onInstalled` 时重新注册规则（配置可能在扩展停用期间被改过）。
- **`public/icons/`** 里的图标会被原样拷到 `dist/`。**必须放在 `public/`**：`applyConfig` 在运行时切换绿色图标，而 crxjs 只会打包 manifest 里静态引用到的那两个。

### 三个容易踩的点

**规则优先级**：规则「从上到下、先改的赢」，靠 `priority: applicable.length - index` 递减实现——行号越小优先级越高。group 是**先展开成普通规则再算优先级**，所以一个 group 会占掉 N 个槽位。改排序逻辑时别破坏这个。

**HTML 页面必须是构建入口**：只在 `web_accessible_resources` 里列一个 html，crxjs 会**原样拷贝而不打包**，产物里的 `<script src="./main.tsx">` 在浏览器里直接失效。配置页因此走 `options_ui`。新增页面同理，得挂到某个 manifest 入口字段上。

**start/stop 状态有两个入口**：配置页和工具栏弹窗都能改。配置页用 `chrome.storage.local.onChanged` 只监听 `started` 键来同步——**不要连 `config` 键一起监听**，那是配置页自己拥有的状态，会和每次按键写入打架。

## 配置格式

存 `chrome.storage.local` 的 `config` 键（JSON 字符串），启停状态存 `started`（`'on'`/`'off'`）。当前 `CONFIG_FORMAT_VERSION = '3.0'`：

```
{format_version, debug_mode, items: [
  {kind: 'rule',  status, name, apply_on, action, header_name, header_value, url_filter},
  {kind: 'group', status, name, url_filter, headers: [{status, apply_on, action, header_name, header_value}]}
]}
```

`items` 是**单条规则和 group 混排的一维数组**，顺序决定优先级。group 里的 header **没有自己的 name 和 url_filter**——两者由 group 统一持有，`expandGroup` 展开时下发给每条 header；group 关掉则整组 header 一起失效。group 不支持 `block`（拦截只和 URL 有关，跟批量改 header 无关）。

`convertItemsToDynamicRules` = `flattenItems`（展开 group）+ `convertRulesToDynamicRules`。**优先级在展开后才计算**，所以一个 group 会在它所在的位置占掉 N 个优先级槽位。

`action` 为 `set` / `delete` / `block`；`apply_on` 为 `req` / `res`。

`url_filter` 空 = 所有 URL；用 `/.../` 包裹 = 正则（转成 `regexFilter`）；否则按子串匹配（`urlFilter`）。`block` 规则**必须**有 filter，否则会拦截一切，`isRuleComplete` 会跳过它。

旧配置由 `migrateConfig` 迁移，按 `rules` / `headers` 字段判断来源：2.0 只是把每条 rule 包成 `{kind: 'rule'}`；1.x 额外做 `add`/`modify` → `set`、丢弃 cookie 动作（MV3 无法逐条改 cookie）、`url_contains` 仅在原来开了 `use_url_contains` 时才转为 `url_filter`。`loadState` 会返回 `migrated` 标记，配置页据此立刻落盘，避免每次加载都重跑迁移。

## 样式

Tailwind v4，无 `tailwind.config.js`——设计变量写在 `src/index.css` 的 `@theme` 块里（`--color-accent`、`--color-muted` 等），用起来就是 `bg-accent` / `text-muted`。

主题色是绿色 `#34a853`，`--color-accent` 和 `--color-running` 用的是同一个值：图标本来就在规则生效时变绿，所以「品牌色」和「正在运行」故意是同一个信号。`scripts/make-icons.mjs` 里的 `STATES.green` 也是这个值，改的时候两处一起改。

内容区宽度锁在 1160px 居中，靠自定义 `@utility gutter`（`padding-inline: max(40px, calc((100% - 1160px) / 2))`）。用 padding 而不是包一层容器，是为了让状态栏这种通栏色块的背景能铺满整个宽度。
