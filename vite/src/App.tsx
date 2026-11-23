import { Outlet, useLocation, useNavigate } from '@tanstack/solid-router';
import { ChevronLeft, ChevronRight, Settings, X } from 'solid-craft-icons';
import { createEffect, createMemo, createSignal, For, onCleanup, type Component } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { ConfigProvider } from 'solid-craft/config-provider';
import { Tag } from 'solid-craft/tag';
import { Tooltip } from 'solid-craft/tooltip';
import SettingDrawer from './components/SettingDrawer';
import { DEFAULT_PAGE, pageFromPath, pageMeta, PAGES, type NavIcon, type PageKey } from './pages/meta';
import {
  contentWidth,
  density,
  fixedHeader,
  fixedSider,
  navMode,
  resolvedPrimary,
  setSettingOpen,
  showBreadcrumb,
  showFooter,
  showTabs,
  theme,
} from './settings';

interface NavItem {
  key: PageKey;
  path: string;
  label: string;
  icon: NavIcon;
  group: string;
}

const NAV: NavItem[] = PAGES.map((page) => ({
  key: page.key,
  path: page.path,
  label: page.label,
  icon: page.icon,
  group: page.group,
}));

/** 一组菜单项；vertical 用于侧栏分组，horizontal 用于顶部横菜单 */
const MenuItems: Component<{ items: NavItem[]; horizontal?: boolean; onNavigate: (path: string) => void; page: () => PageKey | null }> = (
  props,
) => (
  <For each={props.items}>
    {(item) => (
      <button
        type="button"
        class="pro-menu-item"
        data-active={props.page() === item.key}
        data-horizontal={props.horizontal ? 'true' : undefined}
        title={item.label}
        onClick={() => props.onNavigate(item.path)}
      >
        <span class="pro-menu-icon" aria-hidden="true">
          <Dynamic component={item.icon} size="1em" />
        </span>
        <span class="pro-menu-label">{item.label}</span>
      </button>
    )}
  </For>
);

const App: Component = () => {
  const navigate = useNavigate();
  const location = useLocation();
  /** URL 是页面激活态的唯一真源；菜单高亮、面包屑、标签都由它派生。 */
  const page = createMemo<PageKey | null>(() => pageFromPath(location().pathname));
  const [tabs, setTabs] = createSignal<PageKey[]>([DEFAULT_PAGE]);
  const [collapsed, setCollapsed] = createSignal(false);

  // 直接输入地址、浏览器前进/后退也会把页面纳入多标签
  createEffect(() => {
    const key = page();
    if (key === null) return;
    setTabs((list) => (list.includes(key) ? list : [...list, key]));
  });

  const groups = createMemo(() => {
    const result: { name: string; items: NavItem[] }[] = [];
    for (const item of NAV) {
      let group = result.find((g) => g.name === item.group);
      if (!group) {
        group = { name: item.group, items: [] };
        result.push(group);
      }
      group.items.push(item);
    }
    return result;
  });

  /** mix 模式：侧栏只显示当前一级分组下的菜单 */
  const activeGroup = createMemo(() => NAV.find((n) => n.key === page())?.group ?? NAV[0]!.group);
  const mixSiderItems = createMemo(() => NAV.filter((n) => n.group === activeGroup()));

  const openPage = (path: string) => {
    void navigate({ to: path });
  };

  const closeTab = (key: PageKey) => {
    const next = tabs().filter((item) => item !== key);
    const fallback = next[next.length - 1] ?? DEFAULT_PAGE;
    setTabs(next.includes(fallback) ? next : [fallback]);
    if (page() === key) void navigate({ to: pageMeta(fallback).path });
  };

  const crumbs = createMemo<readonly string[]>(() => {
    const key = page();
    return key === null ? ['首页', '页面不存在'] : pageMeta(key).breadcrumb;
  });
  const title = () => {
    const key = page();
    return key === null ? '页面不存在' : pageMeta(key).label;
  };

  // 主题色：覆盖到 document root 的 CSS 变量。inline style 优先级高于 tokens.css 的
  // [data-theme] 规则（亮/暗色板），因此一处赋值即可同时驱动组件库与宿主侧栏强调色。
  createEffect(() => {
    const root = document.documentElement;
    const primary = resolvedPrimary();
    root.style.setProperty('--scui-color-primary', primary);
    root.style.setProperty('--scui-color-focus-ring', primary);
  });
  onCleanup(() => {
    const root = document.documentElement;
    root.style.removeProperty('--scui-color-primary');
    root.style.removeProperty('--scui-color-focus-ring');
  });

  // 侧栏/顶栏品牌区（side 竖排、top/mix 横排共用）
  const Brand = () => (
    <div class="pro-brand">
      <span class="pro-brand-mark">SC</span>
      <span class="pro-brand-text">Solid Craft Pro</span>
    </div>
  );

  return (
    <ConfigProvider theme={theme} density={density} direction="ltr" themeTarget="global">
      <div
        class="pro-shell"
        data-nav-mode={navMode()}
        data-collapsed={collapsed()}
        data-fixed-header={fixedHeader()}
        data-fixed-sider={fixedSider()}
        data-content-width={contentWidth()}
      >
        {/* 顶部导航条：top / mix 模式显示 */}
        {navMode() !== 'side' && (
          <div class="pro-topnav">
            <Brand />
            {navMode() === 'top' ? (
              <nav class="pro-topmenu" aria-label="主导航">
                <MenuItems items={NAV} horizontal onNavigate={openPage} page={page} />
              </nav>
            ) : (
              <nav class="pro-topmenu" aria-label="一级导航">
                <For each={groups()}>
                  {(g) => (
                    <button
                      type="button"
                      class="pro-topmenu-group"
                      data-active={activeGroup() === g.name}
                      onClick={() => openPage(g.items[0]!.path)}
                    >
                      {g.name}
                    </button>
                  )}
                </For>
              </nav>
            )}
          </div>
        )}

        <div class="pro-body">
          {/* 侧栏：side / mix 模式显示 */}
          {navMode() !== 'top' && (
            <aside class="pro-sider">
              {/* mix 模式：品牌已在顶栏，侧栏只放二级菜单，避免重复 logo */}
              {navMode() !== 'mix' && <Brand />}
              <nav class="pro-menu" aria-label="主导航">
                {navMode() === 'mix' ? (
                  <div class="pro-menu-group">
                    <div class="pro-menu-group-title">{activeGroup()}</div>
                    <MenuItems items={mixSiderItems()} onNavigate={openPage} page={page} />
                  </div>
                ) : (
                  <For each={groups()}>
                    {(g) => (
                      <div class="pro-menu-group">
                        <div class="pro-menu-group-title">{g.name}</div>
                        <MenuItems items={g.items} onNavigate={openPage} page={page} />
                      </div>
                    )}
                  </For>
                )}
              </nav>
              <button
                type="button"
                class="pro-collapse"
                onClick={() => setCollapsed(!collapsed())}
                aria-label={collapsed() ? '展开侧栏' : '收起侧栏'}
              >
                <span aria-hidden="true">
                  <Dynamic component={collapsed() ? ChevronRight : ChevronLeft} size="1em" />
                </span>
                <span class="pro-menu-label">收起侧栏</span>
              </button>
            </aside>
          )}

          <div class="pro-main">
            {/* 顶栏 */}
            <header class="pro-header">
              <div class="pro-header-left">
                {showBreadcrumb() ? (
                  <span class="pro-crumb">
                    <For each={crumbs()}>{(crumb, index) => (
                      <>
                        {index() > 0 && <span class="pro-crumb-sep">/</span>}
                        <span class={index() === crumbs().length - 1 ? 'pro-crumb-current' : ''}>{crumb}</span>
                      </>
                    )}</For>
                  </span>
                ) : (
                  <span class="pro-crumb-current">{title()}</span>
                )}
              </div>
              <div class="pro-header-right">
                <Tooltip content="页面设置" placement="bottom">
                  <button
                    type="button"
                    class="pro-icon-btn"
                    onClick={() => setSettingOpen(true)}
                    aria-label="页面设置"
                  >
                    <Settings size="18" />
                  </button>
                </Tooltip>
                <Tooltip content="演示账号 · Admin">
                  <button type="button" class="pro-user">
                    <span class="pro-avatar">A</span>
                    <span class="pro-user-name">Admin</span>
                  </button>
                </Tooltip>
              </div>
            </header>

            {/* 多标签页 */}
            {showTabs() && (
              <div class="pro-tabs" role="tablist" aria-label="页面标签">
                <For each={tabs()}>
                  {(key) => (
                    <div
                      class="pro-tab"
                      role="tab"
                      aria-selected={page() === key}
                      data-active={page() === key}
                    >
                      <button type="button" class="pro-tab-main" onClick={() => void navigate({ to: pageMeta(key).path })}>
                        <Dynamic component={NAV.find((item) => item.key === key)?.icon} size="1em" />
                        {NAV.find((item) => item.key === key)?.label}
                      </button>
                      <button
                        type="button"
                        class="pro-tab-close"
                        onClick={() => closeTab(key)}
                        aria-label={`关闭${NAV.find((item) => item.key === key)?.label}`}
                      >
                        <X size="14" />
                      </button>
                    </div>
                  )}
                </For>
              </div>
            )}

            {/* 内容区 */}
            <main class="pro-content">
              <div class="pro-content-inner">
                <Outlet />
              </div>
            </main>

            {showFooter() && (
              <footer class="pro-footer">
                <Tag color="neutral">solid-craft Admin · Vite 版</Tag>
                <span>纯前端演示 / 0.1.0</span>
              </footer>
            )}
          </div>
        </div>
      </div>
      <SettingDrawer />
    </ConfigProvider>
  );
};

export default App;
