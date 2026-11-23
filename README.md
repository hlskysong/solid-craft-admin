# Solid Craft Admin 模板

`solid-craft` 组件库的**试点宿主**（对应 `docs/08` T4-05）：一套真实中后台页面，分别用 Vite / Rsbuild / Bun 三个打包器构建，验证组件库在真实业务工程里的可用性。

## 当前进度

| 版本 | 状态 | 说明 |
| --- | --- | --- |
| **Vite** | ✅ 已完成（纯前端） | 本目录 `vite/`，dev + build + 浏览器交互实测通过 |
| Rsbuild | ⏳ 待确认后开工 | 按约定，Vite 版各方面确认后再做 |
| Bun | ⏳ 待确认后开工 | 同上 |

**范围**：纯前端实现（静态示例数据 + 内存态 CRUD），不接后端、不做登录鉴权、不发布到公网。

## Vite 版

```bash
# shell: fish
cd admin-framework/vite
fnm exec --using 26.12.1 -- pnpm install
fnm exec --using 26.12.1 -- pnpm dev        # http://127.0.0.1:5173
fnm exec --using 26.12.1 -- pnpm build      # 产物 dist/
fnm exec --using 26.12.1 -- pnpm typecheck
```

依赖用 `link:` 指向 `../../ui-design/packages/*`（当前源码，含 T4-02 token 补齐 + T4-05 四项修复），不是 npm 上的 `0.1.0` —— 三个包尚未发布。等 `0.1.0` 正式发布后，改成 `"solid-craft": "^0.1.0"` 即可，无需改页面代码。路由用 npm 正式依赖 `@tanstack/solid-router`（`1.170.43`）。

### 设计风格：Ant Design Pro

布局按 ProLayout 惯例实现（宿主 CSS，不新增 solid-craft 组件）：深色侧栏（#001529）+ 分组菜单 + 可折叠、面包屑 + 顶栏（主题/密度/用户区）、多标签页（可开关）、统计卡带趋势图标与迷你条形图、查询区 + 工具栏 + 表格 + 页脚。

### 页面设置抽屉（Ant Design Pro SettingDrawer 风）

顶栏右侧齿轮 ⚙ 打开设置抽屉，改的是流程**内存态**（刷新回默认），与主题/密度共用 `src/settings.ts` 单例信号：

| 分组 | 设置项 | 生效方式 |
| --- | --- | --- |
| 导航模式 | 侧边 / 顶部 / 混合（图卡） | `data-nav-mode` 驱动：top 隐藏侧栏改顶部横菜单；mix 顶栏放一级分组、侧栏放二级菜单 |
| 主题色 | 6 色预设（蓝/紫/青/绿/橙/红），亮暗各一档 | App 的 effect 把 `resolvedPrimary()` 写到 root 的 `--scui-color-primary` / `--scui-color-focus-ring`，组件库与侧栏强调色一起变 |
| 主题样式 | 亮/暗、标准/紧凑、流式/定宽 | theme/density 传给 ConfigProvider；`data-content-width` 控制 `max-width: 1200px` |
| 布局开关 | 固定顶栏 / 固定侧栏 / 多标签 / 面包屑 / 页脚 | `data-fixed-*` 控制滚动归属；后三项直接条件渲染 DOM |
| 底部 | 重置全部设置 | `resetSettings()` 恢复默认值 |

- **固定侧栏注意**：当前骨架是 `height:100vh` + grid，侧栏天然在视口内；`data-fixed-sider` 控制侧栏「拉伸满高 + 菜单内部滚动」与「自然高度」两种形态，与真正的 sticky 侧栏有差异（待后续布局重构时对齐）。
- **不改组件库**：抽屉里的 Radio/Switch/Drawer/Divider/Tooltip 全部来自 solid-craft，图卡/色板是宿主 CSS（`.pro-setting-*`）。

### 路由：TanStack Router（代码路由）

`@tanstack/solid-router` 用代码路由接入，不引 `router-plugin`、零代码生成：

| 路由 | 路径 | 页面 |
| --- | --- | --- |
| indexRoute | `/` | 工作台 |
| plansRoute | `/plans` | 采购计划 |
| catchAllRoute | `$` | 404（保留 admin 布局，只在内容区提示） |

- `src/router.tsx` 定义 `rootRoute`（component = `App`，承担布局）+ 3 条子路由；`App` 内容区用 `<Outlet />` 渲染页面。
- `src/pages/meta.ts` 是页面元数据真源（key / path / label / icon / group / breadcrumb），路由表与菜单、面包屑共用，避免两处漂移。
- **URL 是激活态唯一真源**：菜单高亮、面包屑、多标签由 `useLocation()` 派生；直接改地址、浏览器前进/后退都会同步多标签；关闭当前标签跳回上一个。
- 入口 `index.tsx` 用 `<RouterProvider router={router} />` 替代 `<App />`。

### 页面与组件覆盖

| 页面 | 用到的 solid-craft 能力 |
| --- | --- |
| 工作台 | `Card` × 4 统计卡（趋势/迷你图）、`Table`、`Tag`（三态色）、`Title` |
| 采购计划 | `Form` + `Form.Item`（查询/表单）、`Input`、`InputNumber`、`Select`、`Table`（分页/总条数）、`Modal`（异步 onOk）、`Popconfirm`（删除确认）、`Button`（多 variant/color）、`message`（成功/错误反馈）、`useForm` |
| 全局 | `ConfigProvider`（主题/密度/方向）、亮暗主题切换、紧凑密度切换、多标签导航 |

### 实测结果（2026-11-20）

- `pnpm typecheck` **RC=0**、`pnpm build` **RC=0**（212 modules，JS 199.07 kB / gzip 61.31 kB，CSS 98.52 kB / gzip 13.65 kB）
- 浏览器（Chrome DevTools）实测：Pro 布局（侧栏/面包屑/2 标签/4 统计卡/分页表格）渲染正常；折叠侧栏、暗色主题（body `#262626` / 面板 `#1f1f1f`）、菜单切换、**新增计划全链路**均通过（8→9 条）
- **四项组件库修复在本模板复验通过**：主题属性统一后暗色直接生效（无需桥接）、表头 color-mix、Select 浮层 z=1100 压在 Modal 之上且左边缘对齐触发器（offsetLeft=0）
- console：**0 error**；1 条 `aria-hidden` warn（见已知问题 2）

### 路由接入实测（2026-11-23）

- `pnpm typecheck` **RC=0**、`pnpm build` **RC=0**（296 modules，JS 283.60 kB / gzip 89.44 kB，CSS 111.25 kB / gzip 15.18 kB）
- Chrome DevTools 实测：`/` 显示工作台；侧栏与顶部菜单点「采购计划」均跳 `/plans` 并切换内容/高亮/面包屑；`/nope` 落 404 且保留布局、无菜单误高亮；关闭「采购计划」标签跳回 `/`；浏览器后退时菜单高亮随 URL 回到工作台，多标签保留历史打开项。

## 已知问题（试点发现，属于组件库侧）

1. **图标包是占位导出**：`solid-craft-icons` 目前只有 `ICONS_PACKAGE_VERSION`，没有真实图标，模板导航用 Unicode 字符代替。
2. **Select 关闭浮层时的 aria-hidden 警告**：实测鼠标选中 option 后关闭弹层，Chrome 报 `Blocked aria-hidden ... descendant retained focus`（焦点短暂留在 `li.scui-select__option`）。属 Kobalte 0.13.14 焦点归还时序，不影响功能，未纳入本轮修复（会碰 primitive 焦点管理，需单独排期）。
3. **docs/01 §SSR 摘录的旧属性名**：llms 文档 `guides/ssr.md` 的规范摘录仍写 `data-scui-theme`（源头是冻结的 docs/01，不可改）；实际运行时属性已是 `data-theme`，以 ConfigProvider 源码为准。

## 目录结构

```
admin-framework/
├── README.md                    # 本文件
├── pnpm-workspace.yaml          # 统管 vite/ + _shared/*
├── pnpm-lock.yaml
├── _shared/
│   └── click-to-ide/            # 共享：Alt+点击跳 IDE（vite/rsbuild/bun 通用）
│       ├── src/protocol.ts      # 端点常量 + URL 生成/解析
│       ├── src/node.ts          # openInIde() exec CLI + createIdeMiddleware()
│       ├── src/client.ts        # setupClickToIde() 浏览器 Alt 高亮 + 跳转
│       └── src/index.ts
└── vite/
    ├── package.json             # link: 依赖当前源码包 + click-to-ide
    ├── vite.config.mjs          # vite-plugin-solid + 位置注入 + IDE middleware 挂载
    ├── index.html
    ├── tsconfig.json
    └── src/
        ├── index.tsx            # 入口 + RouterProvider + 样式引入 + DEV 下装 click-to-ide
        ├── router.tsx           # 代码路由表：rootRoute + 3 条子路由 + Register 类型
        ├── App.tsx              # 根路由布局：side/top/mix 三模式 + 面包屑/多标签/Outlet/设置入口
        ├── settings.ts          # 布局设置单例信号（导航模式/主题色/开关/重置）
        ├── components/
        │   └── SettingDrawer.tsx# Ant Design Pro 风设置抽屉
        ├── styles.css           # 宿主样式（只用 --scui-* token）
        ├── globals.d.ts
        └── pages/
            ├── meta.ts          # 页面元数据真源（key/path/文案/分组/面包屑）
            ├── Dashboard.tsx
            ├── Plans.tsx
            └── NotFound.tsx     # catch-all 404 页
```

## click-to-component（跨打包器共享）

`_shared/click-to-ide/` 提供 Alt+点击源码定位跳转，三个打包器模板共用。设计要点：

- **位置信息源**：`solid-devtools/vite` 的 `jsxLocation` 注入 `data-source-loc="src/App.tsx:64:8"` 属性。
  **不用**它的 runtime / overlay / Chrome 扩展——共享包只读这个 DOM 属性。
- **链路**：浏览器 `setupClickToIde()`（Alt 高亮 + 点击）→ `GET /__open_ide?file=&line=&column=` →
  Node `createIdeMiddleware()` → exec `openidea --line N --column M <abs-path>`（复用已运行的 OpenIDEA）。
- **三个模板各写两行**：dev 配置挂 `createIdeMiddleware({ root, extraRoots? })`；入口 `if (import.meta.env.DEV) setupClickToIde()`。
- **只跳宿主工程源码，不进 node_modules**：solid-devtools 的 loc 也注入到组件库编译产物（`dist/source/*.jsx`），
  直接 `closest()` 会跳进库内部。客户端改为收集点击点到根的全部 `data-source-loc`，用 `pickProjectLocation()`
  跳过 `../../` 逃逸 / `node_modules` / `dist/` 定位，取最近一个宿主源码位置（组件在 framework 里的使用处）；
  整链都是依赖则放弃跳转。`isProjectSource` 可覆盖判定（如只认 `src/` 前缀），高亮也只描宿主源码元素。
- **产物→源码映射 + 精确对行**：组件库走 `"solid"` 条件（`dist/source/*.jsx`），devtools 注入的是**产物路径 + 产物行列**。
  `resolveSourceLocation()` 在校验前：① 把 `<pkg>/dist/source/X.jsx` 映射为同包 `<pkg>/src/X.tsx`（目标存在才替换）；
  ② 读同目录 `X.jsx.map`（组件库 `build-source.mjs` 产出），用 `@jridgewell/trace-mapping` 把行列精确反查回源码
  （实测 Button 产物 `51:8` → 源码 `57:7`）。map 缺失/损坏时回退到近似行，不阻断跳转。
- **IDE 可换**：命令默认 `openidea`，用环境变量 `OPEN_IDE_CMD` 覆盖（如 `code` / `idea`）。
- **安全**：execFile + 数组参数无 shell 注入；路径必须落在 `root` 或 `extraRoots` 内（穿越返回 403），
  映射后的源码路径同样受此校验；参数缺失/非法返回 400。link: 依赖的组件库源码在 root 之外，需显式加入 `extraRoots`：
  `createIdeMiddleware({ root: server.config.root, extraRoots: [path.resolve(root, '../../ui-design')] })`。
- **生产零残留**：middleware `apply: 'serve'` 不进 build；入口用 `import.meta.env.DEV` 静态消除。
  实测生产包 JS 199.13 kB，无 `__open_ide` / `click-to-ide` 关键字。
- **排错**：curl 带 header `x-open-ide-dry-run: 1` 只记录命令不真的打开 IDE。
- **测试**：`pnpm --filter click-to-ide test`（15 条：映射 / sourcemap 精确对行 / map 缺失回退 / 多根 / 穿越 / 参数校验 / 宿主源码筛选）。
