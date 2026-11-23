/**
 * Node 侧：在 dev server 进程里 exec IDE CLI 打开指定源码行。
 * 打包器无关——Vite / Rsbuild / Bun 各自把 createIdeMiddleware() 挂到自己的 dev server 即可。
 */
import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { originalPositionFor, TraceMap } from '@jridgewell/trace-mapping';
import {
  DEFAULT_IDE_COMMAND,
  DRY_RUN_HEADER,
  IDE_COMMAND_ENV,
  IDE_ENDPOINT,
  parseIdeQuery,
  type IdeLocation,
} from './protocol.ts';

export interface OpenInIdeOptions extends IdeLocation {
  /** 项目根目录绝对路径（用于把相对路径拼成绝对路径 + 目录穿越校验） */
  root: string;
  /**
   * 额外允许的可信根（绝对路径）。组件库以 link: 依赖被消费时，其源码在 Vite root
   * 之外（如 ../../ui-design/packages/core/src），需显式加入白名单才能通过穿越校验。
   * 默认无额外根（仅 root 内可见），保持最小权限。
   */
  extraRoots?: string[];
  /** IDE CLI 命令，默认读 process.env.OPEN_IDE_CMD，再回退 openidea */
  command?: string;
  /** 排错用：只算命令不执行 */
  dryRun?: boolean;
  logger?: { info(msg: string): void; error(msg: string): void };
}

/** solid-craft 组件库 "solid" 条件产物路径里的固定段 */
const DIST_SOURCE_SEGMENT = /[\\/]dist[\\/]source[\\/]/;
const SOURCE_SEGMENT = /[\\/]src[\\/]/;

/**
 * 把 dist/source 产物路径映射到对应 TS 源码路径。
 *
 * 背景：solid-devtools 的 jsxLocation 注入的是 Vite 真正编译的模块路径；组件库走
 * "solid" 条件（dist/source/*.jsx，保留 JSX 供宿主重编译），所以注入的是产物路径。
 * 点击应打开人写的源码而非编译产物 —— 同包内 dist/source/X.jsx → src/X.tsx。
 *
 * 仅当映射后的源码文件确实存在才替换；否则原样返回（回退到产物路径，仍能打开）。
 * 行列请用 resolveSourceLocation() 一起反查 —— 擦除 TS 类型会让行号漂移。
 */
export function mapDistSourceToSource(abs: string): string {
  if (!DIST_SOURCE_SEGMENT.test(abs) || SOURCE_SEGMENT.test(abs)) return abs;
  const marker = DIST_SOURCE_SEGMENT.exec(abs);
  if (!marker) return abs;
  const tail = abs.slice(marker.index + marker[0].length);
  const dot = tail.lastIndexOf('.');
  if (dot < 1) return abs;
  const base = abs.slice(0, marker.index); // <pkgRoot>（不含尾部分隔符）
  const stem = tail.slice(0, dot); // components/button/Button
  const candidates = [`.tsx`, `.ts`, `.jsx`].map((ext) => path.join(base, 'src', `${stem}${ext}`));
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return abs;
}

/**
 * 把「产物路径 + 产物行列」解析成「源码路径 + 源码精确行列」。
 *
 * 产物路径（dist/source/*.jsx）旁若有 esbuild 生成的 *.jsx.map（build-source.mjs 产出，
 * 含 sourcesContent + mappings），用 trace-mapping 把行列精确反查回手写源码；
 * map 缺失 / 解析失败 / 反查无结果时回退：路径仍映射到 src，行列沿用原值（近似定位，
 * 旧行为），绝不因 sourcemap 问题让点击失效。非产物路径原样返回。
 */
export function resolveSourceLocation(resolved: string, line: number, column: number): IdeLocation {
  const file = mapDistSourceToSource(resolved);
  if (file === resolved) return { file, line, column }; // 非产物路径（应用自身源码等）

  const mapFile = `${resolved}.map`;
  if (!existsSync(mapFile)) return { file, line, column };
  try {
    const raw = JSON.parse(readFileSync(mapFile, 'utf8'));
    const traceMap = new TraceMap(raw, mapFile);
    const original = originalPositionFor(traceMap, { line, column });
    if (original && original.line && original.column && original.source) {
      return { file, line: original.line, column: original.column };
    }
  } catch {
    // sourcemap 坏了也不阻塞跳转，回退到近似行
  }
  return { file, line, column };
}

export interface OpenInIdeResult {
  ok: boolean;
  status?: number;
  message?: string;
  command?: string;
  args?: string[];
}

/**
 * 核心：校验路径 → 拼命令 → exec（或 dry-run）。
 * 用 execFile + 数组参数，不经 shell，无命令注入面。
 */
export function openInIde(options: OpenInIdeOptions): OpenInIdeResult {
  const { file, line, column, root } = options;
  const command = options.command ?? process.env[IDE_COMMAND_ENV] ?? DEFAULT_IDE_COMMAND;
  const log = options.logger ?? console;

  // 解析绝对路径 → 产物路径映射到 src + sourcemap 精确反查行列
  const resolved = path.resolve(root, file);
  const loc = resolveSourceLocation(resolved, line, column);
  const abs = loc.file;

  // 目录穿越防护：映射后的绝对路径必须落在 root 或某个 extraRoot 内（path.sep 边界避免误判）
  const allowedRoots = [root, ...(options.extraRoots ?? [])].map((r) => path.resolve(r));
  const inside = allowedRoots.some((rootAbs) => abs === rootAbs || abs.startsWith(rootAbs + path.sep));
  if (!inside) {
    return { ok: false, status: 403, message: 'file outside allowed roots' };
  }

  const args = ['--line', String(loc.line), '--column', String(loc.column), abs];
  const cmdLine = `${command} ${args.join(' ')}`;

  if (options.dryRun) {
    log.info(`[click-to-ide] DRY-RUN: ${cmdLine}`);
    return { ok: true, command, args };
  }

  execFile(command, args, { timeout: 10000 }, (err) => {
    if (err) log.error(`[click-to-ide] exec failed: ${err.message}`);
    else log.info(`[click-to-ide] opened ${abs}:${loc.line}:${loc.column}`);
  });
  return { ok: true, command, args };
}

// ---- connect 风格 middleware（Vite / Rsbuild 直接 use；Bun 可包一层适配） ----

type MiddlewareReq = { url?: string; headers: Record<string, string | string[] | undefined> };
type MiddlewareRes = {
  statusCode: number;
  setHeader(k: string, v: string): void;
  end(body?: string): void;
};
type Middleware = (req: MiddlewareReq, res: MiddlewareRes, next: () => void) => void;

export interface IdeMiddlewareOptions {
  /** 项目根目录（Vite: server.config.root；Rsbuild/Bun 传 process.cwd() 或对应 root） */
  root: string;
  /** 额外可信根（如 link: 依赖的组件库源码根），默认无 */
  extraRoots?: string[];
  command?: string;
  logger?: { info(msg: string): void; error(msg: string): void };
}

/** 返回一个只处理 IDE_ENDPOINT 的 middleware，其它请求交给 next() */
export function createIdeMiddleware(options: IdeMiddlewareOptions): Middleware {
  return (req, res, next) => {
    if (!req.url?.startsWith(`${IDE_ENDPOINT}?`)) return next();

    const url = new URL(req.url, 'http://localhost');
    const loc = parseIdeQuery(url);
    if (!loc) {
      res.statusCode = 400;
      res.end('[click-to-ide] invalid file/line/column');
      return;
    }

    const dryRun = req.headers[DRY_RUN_HEADER] === '1';
    const result = openInIde({
      ...loc,
      root: options.root,
      extraRoots: options.extraRoots,
      command: options.command,
      dryRun,
      logger: options.logger,
    });
    if (!result.ok) {
      res.statusCode = result.status ?? 400;
      res.end(`[click-to-ide] ${result.message ?? 'failed'}`);
      return;
    }

    // window.open 打开的标签页自动关闭，不打扰开发
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><title>Opened in IDE</title><p>Opened in IDE</p><script>window.close()<\/script>');
  };
}
