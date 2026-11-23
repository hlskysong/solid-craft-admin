/**
 * 浏览器侧：Alt+点击源码定位（打包器无关，纯 DOM + 一个 HTTP 请求）。
 *
 * 位置信息来自 solid-devtools/vite 注入的 data-source-loc 属性；本模块只读它，
 * 不需要 solid-devtools runtime，也不需要 @solid-devtools/overlay / Chrome 扩展。
 * 生产构建不调用 setupClickToIde() 即可被 tree-shake 干净。
 */
import { buildIdeUrl, LOCATION_ATTR, parseLocationAttr, type IdeLocation } from './protocol.ts';

const STYLE_ID = 'click-to-ide-style';
const ACTIVE_CLASS = 'click-to-ide-active';
/** 只给「宿主源码」元素加高亮类；库组件内部元素不高亮，避免误导（点击会跳到外层宿主使用处） */
const PROJECT_CLASS = 'click-to-ide-project';

export interface ClickToIdeOptions {
  /** 触发键，默认 Alt */
  key?: 'Alt' | 'Control' | 'Meta' | 'Shift';
  /** 高亮描边颜色，默认 Ant Design 主色 */
  color?: string;
  /**
   * 判定某个 data-source-loc 的文件是否属于「宿主工程源码」（可跳转目标）。
   * 默认排除依赖 / 构建产物（../../ 逃逸 root、node_modules、dist/）。
   * 宿主工程可覆盖，例如只接受 `src/` 前缀。
   */
  isProjectSource?: (file: string) => boolean;
}

/**
 * 依赖 / 构建产物的源码位置判定。
 *
 * 背景：solid-devtools 的 jsxLocation 会把 data-source-loc 注入到**所有**被编译的 JSX，
 * 包括 node_modules 里以 link: 消费的组件库（走 "solid" 条件时是 dist/source/*.jsx）。
 * 宿主工程的用户关心的是「这个组件在我工程哪里被用到」，而不是组件库内部实现。
 * 因此点击时要跳过这些外部定位，沿 DOM 祖先链找到最近的宿主源码位置。
 */
export function isExternalSourceLocation(file: string): boolean {
  const p = file.replace(/\\/g, '/');
  return (
    p.startsWith('../') ||
    p === '..' ||
    /(^|\/)node_modules(\/|$)/.test(p) ||
    /(^|\/)dist(\/|$)/.test(p)
  );
}

/** 默认的宿主源码判定：非外部定位即视为宿主源码 */
export const defaultIsProjectSource = (file: string): boolean => !isExternalSourceLocation(file);

/**
 * 从「由近及远」的 data-source-loc 链里挑出最近一个宿主源码位置。
 * 全链都是依赖 / 构建产物时返回 null —— 调用方应放弃跳转，而不是跳进 node_modules。
 */
export function pickProjectLocation(
  locations: ReadonlyArray<string | null | undefined>,
  isProject: (file: string) => boolean = defaultIsProjectSource,
): IdeLocation | null {
  for (const raw of locations) {
    const loc = parseLocationAttr(raw);
    if (loc && isProject(loc.file)) return loc;
  }
  return null;
}

const MODIFIER: Record<NonNullable<ClickToIdeOptions['key']>, keyof KeyboardEvent> = {
  Alt: 'altKey',
  Control: 'ctrlKey',
  Meta: 'metaKey',
  Shift: 'shiftKey',
};

/** 安装 Alt+点击跳转，返回卸载函数 */
export function setupClickToIde(options: ClickToIdeOptions = {}): () => void {
  const key = options.key ?? 'Alt';
  const color = options.color ?? '#1677ff';
  const modifier = MODIFIER[key];
  const isProject = options.isProjectSource ?? defaultIsProjectSource;

  // 高亮样式只注入一次；只描边宿主源码元素
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      `body.${ACTIVE_CLASS} .${PROJECT_CLASS} { ` +
      `outline: 2px solid ${color}; outline-offset: 1px; cursor: pointer; }`;
    document.head.appendChild(style);
  }

  let active = false;
  const setActive = (next: boolean) => {
    if (active === next) return;
    active = next;
    document.body.classList.toggle(ACTIVE_CLASS, next);
  };
  const holdsKey = (e: KeyboardEvent) => Boolean(e[modifier]);

  // SPA 切页后 DOM 会变：每次激活重扫一遍，给宿主源码元素打高亮类。
  const refreshHighlights = () => {
    document.querySelectorAll(`[${LOCATION_ATTR}]`).forEach((el) => {
      const loc = parseLocationAttr(el.getAttribute(LOCATION_ATTR));
      el.classList.toggle(PROJECT_CLASS, Boolean(loc && isProject(loc.file)));
    });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (holdsKey(e)) {
      if (!active) refreshHighlights();
      setActive(true);
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (!holdsKey(e)) setActive(false);
  };
  const onBlur = () => setActive(false);
  const onClick = (e: MouseEvent) => {
    if (!active) return;
    const target = e.target;
    if (!(target instanceof Element)) return;

    // 关键点：组件库内部 DOM 也带 data-source-loc（指向 dist/source 产物）。
    // 不能用 closest() 只取最近一个 —— 那会跳进 node_modules。改为沿祖先链收集
    // 全部定位（由近及远），取最近一个宿主源码位置 = 组件在 framework 里的使用处。
    const chain: (string | null)[] = [];
    let node: Element | null = target;
    while (node) {
      const raw = node.getAttribute(LOCATION_ATTR);
      if (raw) chain.push(raw);
      node = node.parentElement;
    }
    const loc = pickProjectLocation(chain, isProject);
    if (!loc) return; // 整条链都是依赖/产物：放弃跳转，绝不跳进 node_modules

    e.preventDefault();
    e.stopPropagation();
    window.open(buildIdeUrl(loc), '_blank');
    setActive(false);
  };

  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', onBlur);
  document.addEventListener('click', onClick, true);

  return () => {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('blur', onBlur);
    document.removeEventListener('click', onClick, true);
    setActive(false);
  };
}
