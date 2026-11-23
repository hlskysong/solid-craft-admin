/** 页面注册元数据：路由表与布局菜单共用同一份真源，避免页面 key / path / 文案两处漂移。 */
import { LayoutDashboard, LayoutList } from 'solid-craft-icons';
import type { Component } from 'solid-js';

export type PageKey = 'dashboard' | 'plans';

/** 菜单图标组件：solid-craft-icons 精选集，接管尺寸由宿主 CSS 的 font-size 决定。 */
export type NavIcon = Component<{ size?: string | number; class?: string }>;

export interface PageMeta {
  key: PageKey;
  path: string;
  label: string;
  icon: NavIcon;
  group: string;
  breadcrumb: readonly string[];
}

export const PAGES: readonly PageMeta[] = [
  {
    key: 'dashboard',
    path: '/',
    label: '工作台',
    icon: LayoutDashboard,
    group: '总览',
    breadcrumb: ['首页', '工作台'],
  },
  {
    key: 'plans',
    path: '/plans',
    label: '采购计划',
    icon: LayoutList,
    group: '业务管理',
    breadcrumb: ['首页', '业务管理', '采购计划'],
  },
];

export const DEFAULT_PAGE: PageKey = 'dashboard';

/** 未知路径返回 null，由 catch-all 路由渲染 404，布局不再误高亮工作台。 */
export function pageFromPath(pathname: string): PageKey | null {
  return PAGES.find((page) => page.path === pathname)?.key ?? null;
}

export function pageMeta(key: PageKey): PageMeta {
  return PAGES.find((page) => page.key === key) ?? PAGES[0]!;
}
