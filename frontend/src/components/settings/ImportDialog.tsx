import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Server, Folder, ChevronDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImportTabbySelected } from "../../../wailsjs/go/main/App";
import { import_svc } from "../../../wailsjs/go/models";
import { useAssetStore } from "@/stores/assetStore";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: import_svc.PreviewResult | null;
}

export function ImportDialog({ open, onOpenChange, preview }: ImportDialogProps) {
  const { t } = useTranslation();
  const { refresh } = useAssetStore();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["__all__"]));

  // 当 preview 变化时重置选择（默认选中所有不存在的）
  useMemo(() => {
    if (preview) {
      const defaultSelected = new Set<number>();
      for (const item of preview.items) {
        if (!item.exists) {
          defaultSelected.add(item.index);
        }
      }
      setSelected(defaultSelected);
      // 默认展开所有分组
      const groups = new Set(["__ungrouped__", ...preview.groups.map((g) => g.id)]);
      setExpandedGroups(groups);
    }
  }, [preview]);

  if (!preview) return null;

  // 按分组归类
  const groupMap = new Map<string, string>();
  for (const g of preview.groups) {
    groupMap.set(g.id, g.name);
  }

  const groupedItems = new Map<string, import_svc.PreviewItem[]>();
  for (const item of preview.items) {
    const gid = item.groupId || "__ungrouped__";
    if (!groupedItems.has(gid)) groupedItems.set(gid, []);
    groupedItems.get(gid)!.push(item);
  }

  const toggleItem = (index: number) => {
    const next = new Set(selected);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelected(next);
  };

  const toggleGroup = (groupId: string) => {
    const items = groupedItems.get(groupId) || [];
    const allSelected = items.every((i) => selected.has(i.index));
    const next = new Set(selected);
    for (const item of items) {
      if (allSelected) {
        next.delete(item.index);
      } else {
        next.add(item.index);
      }
    }
    setSelected(next);
  };

  const toggleExpand = (groupId: string) => {
    const next = new Set(expandedGroups);
    if (next.has(groupId)) {
      next.delete(groupId);
    } else {
      next.add(groupId);
    }
    setExpandedGroups(next);
  };

  const selectAll = () => {
    setSelected(new Set(preview.items.map((i) => i.index)));
  };

  const selectNone = () => {
    setSelected(new Set());
  };

  const handleImport = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    try {
      const result = await ImportTabbySelected(Array.from(selected));
      toast.success(
        t("import.result", {
          total: result.total,
          success: result.success,
          skipped: result.skipped,
          failed: result.failed,
        })
      );
      await refresh();
      onOpenChange(false);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setImporting(false);
    }
  };

  // 排序：有分组的在前
  const groupOrder = [...preview.groups.map((g) => g.id)];
  if (groupedItems.has("__ungrouped__")) {
    groupOrder.push("__ungrouped__");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("import.tabby")}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {t("import.selectedCount", {
              selected: selected.size,
              total: preview.items.length,
            })}
          </span>
          <span className="ml-auto flex gap-2">
            <button className="hover:text-foreground underline" onClick={selectAll}>
              {t("import.selectAll")}
            </button>
            <button className="hover:text-foreground underline" onClick={selectNone}>
              {t("import.selectNone")}
            </button>
          </span>
        </div>

        <ScrollArea className="max-h-[50vh] border rounded-lg">
          <div className="p-2 space-y-0.5">
            {groupOrder.map((gid) => {
              const items = groupedItems.get(gid) || [];
              if (items.length === 0) return null;
              const groupName =
                gid === "__ungrouped__"
                  ? t("asset.ungrouped")
                  : groupMap.get(gid) || gid;
              const expanded = expandedGroups.has(gid);
              const allSelected = items.every((i) => selected.has(i.index));
              const someSelected =
                !allSelected && items.some((i) => selected.has(i.index));

              return (
                <div key={gid}>
                  <div
                    className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium hover:bg-muted cursor-pointer"
                    onClick={() => toggleExpand(gid)}
                  >
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleGroup(gid);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded"
                    />
                    {expanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{groupName}</span>
                    <span className="ml-auto text-muted-foreground">
                      {items.length}
                    </span>
                  </div>
                  {expanded && (
                    <div>
                      {items.map((item) => (
                        <label
                          key={item.index}
                          className={`flex items-center gap-1.5 rounded-md pl-9 pr-2 py-1.5 text-sm cursor-pointer hover:bg-muted ${
                            item.exists ? "opacity-50" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(item.index)}
                            onChange={() => toggleItem(item.index)}
                            className="rounded"
                          />
                          <Server className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate flex-1">{item.name}</span>
                          <span className="text-xs text-muted-foreground font-mono shrink-0">
                            {item.host}:{item.port}
                          </span>
                          {item.exists && (
                            <span className="text-xs text-yellow-500 shrink-0">
                              {t("import.exists")}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("action.cancel")}
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || selected.size === 0}
          >
            {importing
              ? t("import.importing")
              : t("import.confirmImport", { count: selected.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
