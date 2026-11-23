import path from 'node:path';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite';
import { createIdeMiddleware } from 'click-to-ide/node';

/**
 * Vite 版 admin 模板。vite-plugin-solid 会自动把 "solid" 注入 resolve.conditions，
 * 因此 solid-craft 走 dist/source（保留 JSX）由本项目的插件重新编译，SSR-safe。
 * 这里没有 lib 配置——产出的是可部署的站点，不是组件库 bundle。
 *
 * solid-devtools/vite 仅开发期生效，这里只用它的 jsxLocation 做 data-source-loc 属性注入
 * （位置信息源）。runtime / overlay 已拆掉，Alt+点击跳转由 click-to-ide 共享包接管：
 * 浏览器侧 setupClickToIde() 读属性打 /__open_ide，Node 侧 createIdeMiddleware() exec IDE CLI。
 * 三个模板（vite/rsbuild/bun）共用同一份 click-to-ide，各只写这一行 middleware 挂载。
 */
export default defineConfig({
  plugins: [
    devtools({
      autoname: true,
      locator: {
        // 仅占位：保证 jsxLocation/componentLocation 注入；不用 runtime/overlay
        targetIDE: 'webstorm',
        key: 'Alt',
        jsxLocation: true,
        componentLocation: true,
      },
    }),
    solid(),
    {
      name: 'click-to-ide',
      apply: 'serve', // 仅 dev server；pnpm build 不挂载
      configureServer(server) {
        // 组件库以 link: 依赖被消费，源码在 Vite root 之外（../ui-design/packages/*/src）。
        // 加入白名单，否则 dist/source→src 映射后的绝对路径会被穿越校验 403 拒绝。
        const uiDesignRoot = path.resolve(server.config.root, '../../ui-design');
        server.middlewares.use(
          createIdeMiddleware({
            root: server.config.root,
            extraRoots: [uiDesignRoot],
            logger: server.config.logger,
          }),
        );
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
