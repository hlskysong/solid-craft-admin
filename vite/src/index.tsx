import { RouterProvider } from '@tanstack/solid-router';
import { render } from 'solid-js/web';
import { router } from './router';
import 'solid-craft/styles.css';
// 暗色语义变量在 tokens 包，选择器 [data-theme='dark']；
// T4-05 后 ConfigProvider 直接写 data-theme，无需宿主桥接。
import 'solid-craft-tokens/css/dark';
import './styles.css';

const root = document.getElementById('app');
if (!root) {
  throw new Error('[admin-vite] missing #app container');
}

// click-to-component：Alt+点击带 data-source-loc 的元素跳 IDE（复用 _shared/click-to-ide）。
// solid-devtools 只保留 vite 插件做位置属性注入，runtime/overlay 均已拆掉。
// import.meta.env.DEV 让生产 build 静态消除，跳转代码零残留。
if (import.meta.env.DEV) {
  void import('click-to-ide/client').then(({ setupClickToIde }) => setupClickToIde());
}

render(() => <RouterProvider router={router} />, root);
