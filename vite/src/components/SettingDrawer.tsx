/**
 * Ant Design Pro 风设置抽屉。
 *
 * 消费 settings.ts 的单例信号：导航模式图卡、主题色色板、主题/密度、
 * 固定顶栏/侧栏、多标签/面包屑/页脚、内容宽度。全部复用 solid-craft 组件，
 * 宿主 CSS 只负责图卡/色板这类 Pro 专有排版（见 styles.css .pro-setting-*）。
 */
import { For } from 'solid-js';
import { Drawer } from 'solid-craft/drawer';
import { Divider } from 'solid-craft/divider';
import { RadioGroup } from 'solid-craft/radio';
import { Switch } from 'solid-craft/switch';
import { Tooltip } from 'solid-craft/tooltip';
import {
  PRIMARY_PRESETS,
  contentWidth,
  density,
  fixedHeader,
  fixedSider,
  navMode,
  primaryKey,
  resetSettings,
  setContentWidth,
  setDensity,
  setFixedHeader,
  setFixedSider,
  setNavMode,
  setPrimaryKey,
  setSettingOpen,
  setShowBreadcrumb,
  setShowFooter,
  setShowTabs,
  setTheme,
  settingOpen,
  showBreadcrumb,
  showFooter,
  showTabs,
  theme,
  type ContentWidth,
  type NavMode,
} from '../settings';

const NAV_MODES: { value: NavMode; label: string }[] = [
  { value: 'side', label: '侧边' },
  { value: 'top', label: '顶部' },
  { value: 'mix', label: '混合' },
];

const WIDTHS: { value: ContentWidth; label: string }[] = [
  { value: 'Fluid', label: '流式' },
  { value: 'Fixed', label: '定宽' },
];

/** 一行「说明 + 开关」 */
function SwitchRow(props: { label: string; checked: () => boolean; onChange: (v: boolean) => void }) {
  return (
    <div class="pro-setting-row">
      <span class="pro-setting-row-label">{props.label}</span>
      <Switch checked={props.checked()} onChange={props.onChange} aria-label={props.label} />
    </div>
  );
}

/** 导航模式图卡：纯 CSS 画三种布局缩略图 */
function NavModeCard(props: { value: NavMode; label: string }) {
  return (
    <button
      type="button"
      class="pro-setting-mode-card"
      data-active={navMode() === props.value}
      onClick={() => setNavMode(props.value)}
      aria-label={`${props.label}导航模式`}
      aria-pressed={navMode() === props.value}
    >
      <span class={`pro-setting-mode-art art-${props.value}`} aria-hidden="true">
        <span class="art-bar" />
        <span class="art-body">
          <span class="art-menu" />
          <span class="art-content" />
        </span>
      </span>
      <span class="pro-setting-mode-label">{props.label}</span>
    </button>
  );
}

export default function SettingDrawer() {
  return (
    <Drawer
      open={settingOpen()}
      onOpenChange={setSettingOpen}
      title="页面设置"
      placement="right"
      width={300}
      class="pro-setting-drawer"
    >
      <div class="pro-setting-body">
        {/* 导航模式 */}
        <div class="pro-setting-section">
          <div class="pro-setting-title">导航模式</div>
          <div class="pro-setting-modes">
            <For each={NAV_MODES}>{(m) => <NavModeCard value={m.value} label={m.label} />}</For>
          </div>
        </div>

        <Divider />

        {/* 主题色 */}
        <div class="pro-setting-section">
          <div class="pro-setting-title">主题色</div>
          <div class="pro-setting-colors">
            <For each={PRIMARY_PRESETS}>
              {(p) => (
                <Tooltip content={p.name} placement="top">
                  <button
                    type="button"
                    class="pro-setting-color"
                    style={{ '--swatch': p.light }}
                    data-active={primaryKey() === p.key}
                    onClick={() => setPrimaryKey(p.key)}
                    aria-label={p.name}
                    aria-pressed={primaryKey() === p.key}
                  >
                    {primaryKey() === p.key && <span class="pro-setting-color-check">✓</span>}
                  </button>
                </Tooltip>
              )}
            </For>
          </div>
        </div>

        <Divider />

        {/* 主题 / 密度 / 内容宽度 */}
        <div class="pro-setting-section">
          <div class="pro-setting-title">主题样式</div>
          <div class="pro-setting-field">
            <span class="pro-setting-row-label">主题</span>
            <RadioGroup
              size="small"
              value={theme() === 'dark' ? 'dark' : 'light'}
              options={[
                { label: '亮色', value: 'light' },
                { label: '暗色', value: 'dark' },
              ]}
              onChange={(v) => setTheme(v as 'light' | 'dark')}
            />
          </div>
          <div class="pro-setting-field">
            <span class="pro-setting-row-label">界面密度</span>
            <RadioGroup
              size="small"
              value={density()}
              options={[
                { label: '标准', value: 'default' },
                { label: '紧凑', value: 'compact' },
              ]}
              onChange={(v) => setDensity(v as 'default' | 'compact')}
            />
          </div>
          <div class="pro-setting-field">
            <span class="pro-setting-row-label">内容宽度</span>
            <RadioGroup
              size="small"
              value={contentWidth()}
              options={WIDTHS.map((w) => ({ label: w.label, value: w.value }))}
              onChange={(v) => setContentWidth(v as ContentWidth)}
            />
          </div>
        </div>

        <Divider />

        {/* 布局开关 */}
        <div class="pro-setting-section">
          <div class="pro-setting-title">布局开关</div>
          <SwitchRow label="固定顶栏" checked={fixedHeader} onChange={setFixedHeader} />
          <SwitchRow label="固定侧栏" checked={fixedSider} onChange={setFixedSider} />
          <SwitchRow label="多标签页" checked={showTabs} onChange={setShowTabs} />
          <SwitchRow label="面包屑" checked={showBreadcrumb} onChange={setShowBreadcrumb} />
          <SwitchRow label="页脚" checked={showFooter} onChange={setShowFooter} />
        </div>

        <Divider />

        <button type="button" class="pro-setting-reset" onClick={resetSettings}>
          重置全部设置
        </button>
      </div>
    </Drawer>
  );
}
