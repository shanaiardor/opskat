/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // 改用 terser：esbuild 的死代码消除存在一个 bug——把 xterm.js 里
    // `requestMode` 中 `let r; (IIFE)(r||={});` 错误地改成 `(IIFE)(void 0||(n={}))`，
    // `n` 未声明，导致运行时 `ReferenceError: Can't find variable: n`，
    // vim 等通过 DECRQM 查询终端能力的程序会让 xterm.js parser 崩溃，
    // 从而屏幕渲染停滞、键盘看上去"无响应"。
    minify: "terser",
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/__tests__/setup.ts"],
  },
});
