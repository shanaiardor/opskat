import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconPicker } from "@/components/asset/IconPicker";
import { useAssetStore } from "@/stores/assetStore";
import { group_entity } from "../../../wailsjs/go/models";

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editGroup?: group_entity.Group | null;
}

export function GroupDialog({ open, onOpenChange, editGroup }: GroupDialogProps) {
  const { t } = useTranslation();
  const { createGroup, updateGroup, groups } = useAssetStore();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState(0);
  const [icon, setIcon] = useState("folder");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editGroup) {
        setName(editGroup.Name);
        setParentId(editGroup.ParentID || 0);
        setIcon(editGroup.Icon || "folder");
      } else {
        setName("");
        setParentId(0);
        setIcon("folder");
      }
    }
  }, [open, editGroup]);

  // Build group tree for select, excluding self and descendants when editing
  const buildGroupOptions = () => {
    const excludeIds = new Set<number>();
    if (editGroup) {
      // Exclude self and all descendants to prevent circular references
      const collectDescendants = (id: number) => {
        excludeIds.add(id);
        for (const g of groups.filter((g) => (g.ParentID || 0) === id)) {
          collectDescendants(g.ID);
        }
      };
      collectDescendants(editGroup.ID);
    }

    const options: { id: number; name: string; depth: number }[] = [];
    const addChildren = (pid: number, depth: number) => {
      for (const g of groups.filter((g) => (g.ParentID || 0) === pid)) {
        if (excludeIds.has(g.ID)) continue;
        options.push({ id: g.ID, name: g.Name, depth });
        addChildren(g.ID, depth + 1);
      }
    };
    addChildren(0, 0);
    return options;
  };
  const groupOptions = buildGroupOptions();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editGroup) {
        await updateGroup(
          new group_entity.Group({
            ...editGroup,
            Name: name.trim(),
            ParentID: parentId,
            Icon: icon,
          })
        );
      } else {
        await createGroup(
          new group_entity.Group({
            Name: name.trim(),
            ParentID: parentId,
            Icon: icon,
          })
        );
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {editGroup ? t("action.edit") : t("action.add")} {t("asset.group")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>{t("asset.groupName")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("asset.icon")}</Label>
            <IconPicker value={icon} onChange={setIcon} type="group" />
          </div>
          <div className="grid gap-2">
            <Label>{t("asset.parentGroup")}</Label>
            <Select
              value={String(parentId)}
              onValueChange={(v) => setParentId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t("asset.parentGroupNone")}</SelectItem>
                {groupOptions.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {"  ".repeat(g.depth) + g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("action.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {t("action.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
