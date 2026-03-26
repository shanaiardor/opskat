import { describe, it, expect } from "vitest";
import { toXtermTheme } from "../stores/terminalThemeStore";
import { builtinThemes } from "../data/terminalThemes";
import type { TerminalTheme } from "../data/terminalThemes";

describe("toXtermTheme", () => {
  it("maps all color properties from TerminalTheme to xterm ITheme", () => {
    const theme: TerminalTheme = {
      id: "test",
      name: "Test Theme",
      background: "#000000",
      foreground: "#ffffff",
      cursor: "#ff0000",
      cursorAccent: "#00ff00",
      selectionBackground: "#0000ff",
      black: "#111111",
      red: "#222222",
      green: "#333333",
      yellow: "#444444",
      blue: "#555555",
      magenta: "#666666",
      cyan: "#777777",
      white: "#888888",
      brightBlack: "#999999",
      brightRed: "#aaaaaa",
      brightGreen: "#bbbbbb",
      brightYellow: "#cccccc",
      brightBlue: "#dddddd",
      brightMagenta: "#eeeeee",
      brightCyan: "#f0f0f0",
      brightWhite: "#fafafa",
    };

    const result = toXtermTheme(theme);

    expect(result.background).toBe("#000000");
    expect(result.foreground).toBe("#ffffff");
    expect(result.cursor).toBe("#ff0000");
    expect(result.cursorAccent).toBe("#00ff00");
    expect(result.selectionBackground).toBe("#0000ff");
    expect(result.black).toBe("#111111");
    expect(result.red).toBe("#222222");
    expect(result.green).toBe("#333333");
    expect(result.yellow).toBe("#444444");
    expect(result.blue).toBe("#555555");
    expect(result.magenta).toBe("#666666");
    expect(result.cyan).toBe("#777777");
    expect(result.white).toBe("#888888");
    expect(result.brightBlack).toBe("#999999");
    expect(result.brightRed).toBe("#aaaaaa");
    expect(result.brightGreen).toBe("#bbbbbb");
    expect(result.brightYellow).toBe("#cccccc");
    expect(result.brightBlue).toBe("#dddddd");
    expect(result.brightMagenta).toBe("#eeeeee");
    expect(result.brightCyan).toBe("#f0f0f0");
    expect(result.brightWhite).toBe("#fafafa");
  });

  it("does not include id or name in output", () => {
    const theme = builtinThemes[0];
    const result = toXtermTheme(theme);
    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("name");
  });

  it("works with all builtin themes", () => {
    for (const theme of builtinThemes) {
      const result = toXtermTheme(theme);
      expect(result.background).toBe(theme.background);
      expect(result.foreground).toBe(theme.foreground);
    }
  });
});
