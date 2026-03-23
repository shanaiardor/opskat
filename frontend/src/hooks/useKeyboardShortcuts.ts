import { useEffect } from "react";
import { useTerminalStore } from "@/stores/terminalStore";
import { useShortcutStore, matchShortcut } from "@/stores/shortcutStore";

interface ShortcutHandlers {
  onToggleAIPanel: () => void;
  onToggleSidebar: () => void;
  onPageChange: (page: string) => void;
  onClosePageTab: (page: string) => void;
  openPageTabs: string[];
  activePageTab: string | null;
}

// Virtual tab id: null = asset info, "page:xxx" = page tab, otherwise terminal tab id
type VirtualTabId = string | null;

const PAGE_PREFIX = "page:";

export function useKeyboardShortcuts({
  onToggleAIPanel,
  onToggleSidebar,
  onPageChange,
  onClosePageTab,
  openPageTabs,
  activePageTab,
}: ShortcutHandlers) {
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

      const { tabs, activeTabId, assetInfoOpen, setActiveTab, openAssetInfo, closeAssetInfo, splitPane, closePane } =
        useTerminalStore.getState();

      // Build virtual tab list matching visual tab bar order:
      // [asset info (if open), ...terminal tabs, ...page tabs]
      const allTabIds: VirtualTabId[] = [];
      if (assetInfoOpen) allTabIds.push(null);
      for (const tab of tabs) allTabIds.push(tab.id);
      for (const pageId of openPageTabs) allTabIds.push(PAGE_PREFIX + pageId);

      // Determine current active virtual tab id
      let currentId: VirtualTabId | undefined;
      if (activePageTab) {
        currentId = PAGE_PREFIX + activePageTab;
      } else if (activeTabId) {
        currentId = activeTabId;
      } else if (assetInfoOpen) {
        currentId = null;
      } else {
        currentId = undefined;
      }

      const switchTo = (id: VirtualTabId) => {
        if (id === null) {
          // Asset info tab
          onPageChange("home");
          openAssetInfo();
        } else if (id.startsWith(PAGE_PREFIX)) {
          onPageChange(id.slice(PAGE_PREFIX.length));
        } else {
          // Terminal tab
          onPageChange("home");
          setActiveTab(id);
        }
      };

      // Tab switching: tab.1 ~ tab.9
      const tabMatch = action.match(/^tab\.(\d)$/);
      if (tabMatch) {
        const idx = parseInt(tabMatch[1]) - 1;
        if (idx < allTabIds.length) {
          switchTo(allTabIds[idx]);
        }
        return;
      }

      switch (action) {
        case "tab.close": {
          // Close page tab
          if (activePageTab) {
            onClosePageTab(activePageTab);
            break;
          }
          // Close asset info tab if it's currently active
          if (currentId === null && assetInfoOpen) {
            closeAssetInfo();
            break;
          }
          if (!activeTabId) break;
          const tab = tabs.find((t) => t.id === activeTabId);
          if (tab) {
            closePane(activeTabId, tab.activePaneId);
          }
          break;
        }
        case "tab.prev": {
          if (allTabIds.length === 0) break;
          const curIdx = currentId === undefined ? -1 : allTabIds.indexOf(currentId);
          const prevIdx = curIdx <= 0 ? allTabIds.length - 1 : curIdx - 1;
          switchTo(allTabIds[prevIdx]);
          break;
        }
        case "tab.next": {
          if (allTabIds.length === 0) break;
          const curIdx = currentId === undefined ? -1 : allTabIds.indexOf(currentId);
          const nextIdx = curIdx >= allTabIds.length - 1 ? 0 : curIdx + 1;
          switchTo(allTabIds[nextIdx]);
          break;
        }
        case "split.vertical": {
          if (!activeTabId || activePageTab) break;
          splitPane(activeTabId, "vertical");
          break;
        }
        case "split.horizontal": {
          if (!activeTabId || activePageTab) break;
          splitPane(activeTabId, "horizontal");
          break;
        }
        case "panel.ai":
          onToggleAIPanel();
          break;
        case "panel.sidebar":
          onToggleSidebar();
          break;
        case "page.home":
          onPageChange("home");
          break;
        case "page.settings":
          onPageChange("settings");
          break;
        case "page.sshkeys":
          onPageChange("sshkeys");
          break;
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onToggleAIPanel, onToggleSidebar, onPageChange, onClosePageTab, openPageTabs, activePageTab]);
}
