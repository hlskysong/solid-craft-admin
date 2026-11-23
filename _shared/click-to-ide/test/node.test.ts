/**
 * click-to-ide 契约测试：产物→源码映射 + sourcemap 精确对行 + 多可信根穿越校验。
 * 用 Node 内置 test runner + --experimental-strip-types 直接跑 TS，零额外依赖。
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  defaultIsProjectSource,
  isExternalSourceLocation,
  pickProjectLocation,
} from '../src/client.ts';
import { mapDistSourceToSource, openInIde, resolveSourceLocation } from '../src/node.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
// <root>/admin-framework/_shared/click-to-ide/test → ../../../.. = /solidjs
const solidjsRoot = path.resolve(here, '../../../..');
const viteRoot = path.join(solidjsRoot, 'admin-framework/vite');
const uiRoot = path.join(solidjsRoot, 'ui-design');
const distRel = '../../ui-design/packages/core/dist/source/components/button/Button.jsx';

test('dist/source 产物路径映射到同包 src 源码（存在才替换）', () => {
  const resolved = path.resolve(viteRoot, distRel);
  const mapped = mapDistSourceToSource(resolved);
  assert.equal(mapped, path.join(uiRoot, 'packages/core/src/components/button/Button.tsx'));
  assert.ok(mapped.endsWith('.tsx'), '应打开 TS 源码而非 .jsx 产物');
});

test('sourcemap 把产物行列精确反查回源码（Button 产物 51:8 → 源码 57:7）', () => {
  const resolved = path.resolve(viteRoot, distRel);
  const loc = resolveSourceLocation(resolved, 51, 8);
  assert.equal(loc.file, path.join(uiRoot, 'packages/core/src/components/button/Button.tsx'));
  assert.equal(loc.line, 57);
  assert.equal(loc.column, 7);
});

test('map 缺失时回退到近似行（非产物路径不读 map）', () => {
  const appAbs = path.join(viteRoot, 'src/App.tsx');
  const loc = resolveSourceLocation(appAbs, 64, 8);
  assert.deepEqual(loc, { file: appAbs, line: 64, column: 8 });
});

test('已指向 src 的路径不再二次映射', () => {
  const srcAbs = path.join(uiRoot, 'packages/core/src/components/card/Card.tsx');
  assert.equal(mapDistSourceToSource(srcAbs), srcAbs);
});

test('非产物路径原样返回', () => {
  const appAbs = path.join(viteRoot, 'src/App.tsx');
  assert.equal(mapDistSourceToSource(appAbs), appAbs);
});

test('组件库源码：无 extraRoots 时被 403 拒绝（最小权限）', () => {
  const r = openInIde({ file: distRel, line: 51, column: 8, root: viteRoot, dryRun: true });
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test('组件库源码：有 extraRoots 时放行且打开的是源码', () => {
  const r = openInIde({
    file: distRel,
    line: 51,
    column: 8,
    root: viteRoot,
    extraRoots: [uiRoot],
    dryRun: true,
  });
  assert.equal(r.ok, true);
  assert.equal(r.args?.[4], path.join(uiRoot, 'packages/core/src/components/button/Button.tsx'));
  assert.deepEqual(r.args?.slice(0, 4), ['--line', '57', '--column', '7']);
});

test('应用自身源码始终可打开', () => {
  const r = openInIde({ file: 'src/App.tsx', line: 64, column: 8, root: viteRoot, dryRun: true });
  assert.equal(r.ok, true);
  assert.equal(r.args?.[4], path.join(viteRoot, 'src/App.tsx'));
});

test('目录穿越攻击即使带 extraRoots 仍被 403 拒绝', () => {
  const r = openInIde({
    file: '../../../etc/passwd',
    line: 1,
    column: 1,
    root: viteRoot,
    extraRoots: [uiRoot],
    dryRun: true,
  });
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test('非法参数返回 400（缺行号 / 行号为 0）', async () => {
  const { parseIdeQuery } = await import('../src/protocol.ts');
  assert.equal(parseIdeQuery(new URL('http://x/__open_ide?file=src/a.tsx')), null);
  assert.equal(parseIdeQuery(new URL('http://x/__open_ide?file=src/a.tsx&line=0&column=1')), null);
});

// ---- 宿主源码定位筛选（framework 项目不跳进 node_modules） ----

test('外部定位判定：逃逸 root / node_modules / dist 产物都算外部', () => {
  assert.equal(isExternalSourceLocation('../../ui-design/packages/core/dist/source/components/table/Table.jsx'), true);
  assert.equal(isExternalSourceLocation('node_modules/solid-craft/dist/source/x.jsx'), true);
  assert.equal(isExternalSourceLocation('packages/foo/node_modules/bar/src/a.tsx'), true);
  assert.equal(isExternalSourceLocation('../../shared/x.tsx'), true); // link: 依赖逃逸 root
  assert.equal(isExternalSourceLocation('C:\\repo\\node_modules\\x.jsx'), true); // Windows 分隔符
});

test('宿主源码判定：工程内相对路径不算外部', () => {
  assert.equal(isExternalSourceLocation('src/App.tsx'), false);
  assert.equal(isExternalSourceLocation('src/pages/Dashboard.tsx'), false);
  assert.equal(defaultIsProjectSource('src/App.tsx'), true);
  assert.equal(defaultIsProjectSource('../../ui-design/.../dist/source/x.jsx'), false);
});

test('沿祖先链跳过库组件定位，取最近的宿主使用处', () => {
  // 真实 DOM 链：点击 Table 表头 → 6 层库组件 loc → Dashboard 的 pro-panel → App
  const chain = [
    '../../ui-design/packages/core/dist/source/components/table/Table.jsx:123:13',
    '../../ui-design/packages/core/dist/source/components/table/Table.jsx:93:14',
    '../../ui-design/packages/core/dist/source/components/table/Table.jsx:65:8',
    'src/pages/Dashboard.tsx:96:8',
    'src/App.tsx:173:12',
  ];
  assert.deepEqual(pickProjectLocation(chain), { file: 'src/pages/Dashboard.tsx', line: 96, column: 8 });
});

test('整条链都是依赖/产物时返回 null（放弃跳转，不进 node_modules）', () => {
  const chain = [
    '../../ui-design/packages/core/dist/source/components/card/Card.jsx:10:11',
    '../../ui-design/packages/core/dist/source/components/card/Card.jsx:8:9',
  ];
  assert.equal(pickProjectLocation(chain), null);
  assert.equal(pickProjectLocation([]), null);
});

test('可自定义 isProjectSource 覆盖默认判定', () => {
  const chain = ['vendor/x.jsx:1:1', 'src/App.tsx:64:8'];
  const onlySrc = (file: string) => file.startsWith('src/');
  assert.deepEqual(pickProjectLocation(chain, onlySrc), { file: 'src/App.tsx', line: 64, column: 8 });
  // 自定义规则把 vendor 也判为宿主 → 应取最近的 vendor
  const acceptAll = () => true;
  assert.deepEqual(pickProjectLocation(chain, acceptAll), { file: 'vendor/x.jsx', line: 1, column: 1 });
});
