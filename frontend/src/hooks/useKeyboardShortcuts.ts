import { useEffect } from "react";
import { useTerminalStore } from "@/stores/terminalStore";
import { useAIStore } from "@/stores/aiStore";
import { useShortcutStore, matchShortcut } from "@/stores/shortcutStore";

interface ShortcutHandlers {
  onToggleAIPanel: () => void;
  onToggleSidebar: () => void;
  onPageChange: (page: string) => void;
  onClosePageTab: (page: string) => void;
  openPageTabs: string[];
  activePageTab: string | null;
}

// Virtual tab id: null = asset info, "page:xxx" = page tab, "ai:xxx" = AI tab, otherwise terminal tab id
type VirtualTabId = string | null;

const PAGE_PREFIX = "page:";
const AI_PREFIX = "ai:";

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
      const aiStore = useAIStore.getState();

      // Build virtual tab list: [asset info, ...terminal tabs, ...AI tabs, ...page tabs]
      const allTabIds: VirtualTabId[] = [];
      if (assetInfoOpen) allTabIds.push(null);
      for (const tab of tabs) allTabIds.push(tab.id);
      for (const aiTab of aiStore.openTabs) allTabIds.push(AI_PREFIX + aiTab.id);
      for (const pageId of openPageTabs) allTabIds.push(PAGE_PREFIX + pageId);

      // Determine current active virtual tab id
      let currentId: VirtualTabId | undefined;
      if (activePageTab) {
        if (activePageTab.startsWith("ai:")) {
          currentId = AI_PREFIX + activePageTab.slice(3);
        } else {
          currentId = PAGE_PREFIX + activePageTab;
        }
      } else if (activeTabId) {
        currentId = activeTabId;
      } else if (assetInfoOpen) {
        currentId = null;
      } else {
        currentId = undefined;
      }

      const switchTo = (id: VirtualTabId) => {
        if (id === null) {
          onPageChange("home");
          openAssetInfo();
        } else if (id.startsWith(AI_PREFIX)) {
          const aiTabId = id.slice(AI_PREFIX.length);
          onPageChange("ai:" + aiTabId);
        } else if (id.startsWith(PAGE_PREFIX)) {
          onPageChange(id.slice(PAGE_PREFIX.length));
        } else {
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
          // Close AI tab
          if (activePageTab?.startsWith("ai:")) {
            onClosePageTab(activePageTab);
            break;
          }
          // Close page tab
          if (activePageTab) {
            onClosePageTab(activePageTab);
            break;
          }
          // Close asset info tab
          if (currentId === null && assetInfoOpen) {
            closeAssetInfo();
            break;
          }
          // Close terminal pane
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
