/**
 * 浏览器 ↔ dev server 的跳转协议。打包器无关。
 *
 * 浏览器端（Alt+点击）：把 data-source-loc（形如 "src/App.tsx:64:8"）解析后，
 * 打到 dev server 的 /__open_ide?file=...&line=...&column=... 端点。
 * Node 端（middleware）：解析同样的参数，exec IDE CLI。
 */

/** dev server 端点（挂载在 /__open_ide?... 上） */
export const IDE_ENDPOINT = '/__open_ide';

/** 排错/自动化验证用的 header：带此值只记录命令、不真的打开 IDE */
export const DRY_RUN_HEADER = 'x-open-ide-dry-run';

/** IDE CLI 命令的环境变量覆盖名（不同模板/不同人可用不同 IDE） */
export const IDE_COMMAND_ENV = 'OPEN_IDE_CMD';

/** 默认 IDE CLI（OpenIDEA，原生支持 --line/--column 并复用已运行实例） */
export const DEFAULT_IDE_COMMAND = 'openidea';

/** solid-devtools/vite 注入的 DOM 属性名（源码位置：相对路径:行:列） */
export const LOCATION_ATTR = 'data-source-loc';

export interface IdeLocation {
  file: string;
  line: number;
  column: number;
}

/** 生成跳转 URL（浏览器侧用） */
export function buildIdeUrl(loc: IdeLocation): string {
  return `${IDE_ENDPOINT}?file=${encodeURIComponent(loc.file)}&line=${loc.line}&column=${loc.column}`;
}

/** 解析 "src/App.tsx:64:8" 形式的定位属性 */
export function parseLocationAttr(raw: string | null | undefined): IdeLocation | null {
  if (!raw) return null;
  // 路径可能含冒号（Windows 盘符），用最后两个冒号切分
  const last = raw.lastIndexOf(':');
  const prev = raw.lastIndexOf(':', last - 1);
  if (prev < 0 || last < 0) return null;
  const file = raw.slice(0, prev);
  const line = Number(raw.slice(prev + 1, last));
  const column = Number(raw.slice(last + 1));
  if (!file || !Number.isInteger(line) || !Number.isInteger(column) || line < 1 || column < 1) return null;
  return { file, line, column };
}

/** 从 middleware 的 URL 查询串解析定位参数 */
export function parseIdeQuery(url: URL): IdeLocation | null {
  const file = url.searchParams.get('file');
  const lineRaw = url.searchParams.get('line');
  const columnRaw = url.searchParams.get('column');
  // 先判空再转数字：Number(null)===0 是合法整数，会让缺参数悄悄变成 line=0
  if (!file || lineRaw === null || columnRaw === null) return null;
  const line = Number(lineRaw);
  const column = Number(columnRaw);
  if (!Number.isInteger(line) || !Number.isInteger(column) || line < 1 || column < 1) return null;
  return { file, line, column };
}
