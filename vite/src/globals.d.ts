/** Vite 客户端类型（import.meta.env 等） */
/// <reference types="vite/client" />

/** 允许副作用方式导入本地 CSS 与 tokens 包的暗色主题入口。 */
declare module '*.css';
declare module 'solid-craft-tokens/css/dark';
