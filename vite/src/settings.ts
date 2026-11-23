/**
 * Admin 模板布局设置（Ant Design Pro SettingDrawer 风）。
 *
 * 集中到模块级单例信号，App（消费布局）与 SettingDrawer（修改设置）共享同一份状态，
 * 避免逐层传 props。纯前端、内存态，刷新即回到默认值（模板演示，不持久化）。
 */
import { createSignal } from 'solid-js';
import type { Density, ThemeName } from 'solid-craft/config-provider';

/** 导航模式：侧边栏 / 顶部横菜单 / 顶部+侧栏混合 */
export type NavMode = 'side' | 'top' | 'mix';

/** 内容区宽度：流式铺满 / 定宽居中 */
export type ContentWidth = 'Fluid' | 'Fixed';

/** 预设主题色：每个色给亮/暗两套，暗色用色板亮一档保证对比度（同 solid-craft token 惯例） */
export interface PrimaryPreset {
  name: string;
  key: string;
  light: string;
  dark: string;
}

export const PRIMARY_PRESETS: PrimaryPreset[] = [
  { name: '科技蓝', key: 'blue', light: '#2d66f5', dark: '#5b8cff' },
  { name: '靛紫', key: 'purple', light: '#722ed1', dark: '#9254de' },
  { name: '青碧', key: 'cyan', light: '#13a8a8', dark: '#36cfc9' },
  { name: '薄荷绿', key: 'green', light: '#389e0d', dark: '#73d13d' },
  { name: '琥珀橙', key: 'orange', light: '#d46b08', dark: '#ffa940' },
  { name: '朱砂红', key: 'red', light: '#cf1322', dark: '#ff4d4f' },
];

const DEFAULTS = {
  navMode: 'side' as NavMode,
  theme: 'light' as ThemeName,
  density: 'default' as Density,
  primaryKey: 'blue',
  fixedHeader: true,
  fixedSider: true,
  showTabs: true,
  showBreadcrumb: true,
  showFooter: true,
  contentWidth: 'Fluid' as ContentWidth,
};

// ---- 单例信号 ----
export const [navMode, setNavMode] = createSignal<NavMode>(DEFAULTS.navMode);
export const [theme, setTheme] = createSignal<ThemeName>(DEFAULTS.theme);
export const [density, setDensity] = createSignal<Density>(DEFAULTS.density);
export const [primaryKey, setPrimaryKey] = createSignal<string>(DEFAULTS.primaryKey);
export const [fixedHeader, setFixedHeader] = createSignal<boolean>(DEFAULTS.fixedHeader);
export const [fixedSider, setFixedSider] = createSignal<boolean>(DEFAULTS.fixedSider);
export const [showTabs, setShowTabs] = createSignal<boolean>(DEFAULTS.showTabs);
export const [showBreadcrumb, setShowBreadcrumb] = createSignal<boolean>(DEFAULTS.showBreadcrumb);
export const [showFooter, setShowFooter] = createSignal<boolean>(DEFAULTS.showFooter);
export const [contentWidth, setContentWidth] = createSignal<ContentWidth>(DEFAULTS.contentWidth);
/** 设置抽屉开合（也放这里，App 的齿轮入口与 Drawer 自身共享） */
export const [settingOpen, setSettingOpen] = createSignal<boolean>(false);

/**
 * 当前主题下实际生效的主色 hex（亮/暗各取预设色对应档）。
 * 用普通函数而非模块级 createMemo —— 后者在 render 之外建 computation 会告警且无法释放；
 * 这里在 App 的 createEffect 内调用，读取信号时自然被追踪，响应式不丢失。
 */
export const resolvedPrimary = (): string => {
  const preset = PRIMARY_PRESETS.find((p) => p.key === primaryKey()) ?? PRIMARY_PRESETS[0]!;
  return theme() === 'dark' ? preset.dark : preset.light;
};

/** 恢复全部默认设置 */
export function resetSettings(): void {
  setNavMode(DEFAULTS.navMode);
  setTheme(DEFAULTS.theme);
  setDensity(DEFAULTS.density);
  setPrimaryKey(DEFAULTS.primaryKey);
  setFixedHeader(DEFAULTS.fixedHeader);
  setFixedSider(DEFAULTS.fixedSider);
  setShowTabs(DEFAULTS.showTabs);
  setShowBreadcrumb(DEFAULTS.showBreadcrumb);
  setShowFooter(DEFAULTS.showFooter);
  setContentWidth(DEFAULTS.contentWidth);
}
