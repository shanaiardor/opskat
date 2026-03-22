import { useEffect } from "react";
import { useTerminalStore } from "@/stores/terminalStore";
import { useShortcutStore, matchShortcut } from "@/stores/shortcutStore";
interface ShortcutHandlers {
  onToggleAIPanel: () => void;
  onToggleSidebar: () => void;
}

export function useKeyboardShortcuts({ onToggleAIPanel, onToggleSidebar }: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const { shortcuts, isRecording } = useShortcutStore.getState();
      if (isRecording) return;

      // Don't trigger in form fields, but allow in xterm terminal
      const target = e.target as HTMLElement;
      if (
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable) &&
        !target.closest(".xterm")
      ) {
        return;
      }

      const action = matchShortcut(e, shortcuts);
      if (!action) return;

      e.preventDefault();
      e.stopPropagation();

      const { tabs, activeTabId, setActiveTab, splitPane, closePane } =
        useTerminalStore.getState();

      // Tab switching: tab.1 ~ tab.9
      const tabMatch = action.match(/^tab\.(\d)$/);
      if (tabMatch) {
        const idx = parseInt(tabMatch[1]) - 1;
        if (idx < tabs.length) {
          setActiveTab(tabs[idx].id);
        }
        return;
      }

      switch (action) {
        case "tab.close": {
          if (!activeTabId) break;
          const tab = tabs.find((t) => t.id === activeTabId);
          if (tab) {
            closePane(activeTabId, tab.activePaneId);
          }
          break;
        }
        case "tab.prev": {
          if (tabs.length === 0) break;
          const curIdx = tabs.findIndex((t) => t.id === activeTabId);
          const prevIdx = curIdx <= 0 ? tabs.length - 1 : curIdx - 1;
          setActiveTab(tabs[prevIdx].id);
          break;
        }
        case "tab.next": {
          if (tabs.length === 0) break;
          const curIdx = tabs.findIndex((t) => t.id === activeTabId);
          const nextIdx = curIdx >= tabs.length - 1 ? 0 : curIdx + 1;
          setActiveTab(tabs[nextIdx].id);
          break;
        }
        case "split.vertical": {
          if (!activeTabId) break;
          splitPane(activeTabId, "vertical");
          break;
        }
        case "split.horizontal": {
          if (!activeTabId) break;
          splitPane(activeTabId, "horizontal");
          break;
        }
        case "panel.ai":
          onToggleAIPanel();
          break;
        case "panel.sidebar":
          onToggleSidebar();
          break;
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onToggleAIPanel, onToggleSidebar]);
}
