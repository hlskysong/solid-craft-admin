/** 页面注册元数据：路由表与布局菜单共用同一份真源，避免页面 key / path / 文案两处漂移。 */
export type PageKey = 'dashboard' | 'plans';

export interface PageMeta {
  key: PageKey;
  path: string;
  label: string;
  icon: string;
  group: string;
  breadcrumb: readonly string[];
}

export const PAGES: readonly PageMeta[] = [
  {
    key: 'dashboard',
    path: '/',
    label: '工作台',
    icon: '▦',
    group: '总览',
    breadcrumb: ['首页', '工作台'],
  },
  {
    key: 'plans',
    path: '/plans',
    label: '采购计划',
    icon: '▤',
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
