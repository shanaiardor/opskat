import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssetStore } from "@/stores/assetStore";
import { PolicyTagEditor } from "@/components/asset/PolicyTagEditor";
import { group_entity } from "../../../wailsjs/go/models";
import { UpdateGroup } from "../../../wailsjs/go/main/App";
import { toast } from "sonner";
import { getIconComponent, getIconColor } from "@/components/asset/IconPicker";

interface GroupDetailProps {
  group: group_entity.Group;
}

export function GroupDetail({ group }: GroupDetailProps) {
  const { t } = useTranslation();
  const { assets, groups, fetchGroups } = useAssetStore();

  const [allowList, setAllowList] = useState<string[]>([]);
  const [denyList, setDenyList] = useState<string[]>([]);
  const [allowInput, setAllowInput] = useState("");
  const [denyInput, setDenyInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const policy = JSON.parse(group.CmdPolicy || "{}");
      setAllowList(policy.allow_list || []);
      setDenyList(policy.deny_list || []);
    } catch {
      setAllowList([]);
      setDenyList([]);
    }
    setAllowInput("");
    setDenyInput("");
  }, [group.ID, group.CmdPolicy]);

  const GroupIcon = group.Icon ? getIconComponent(group.Icon) : Folder;
  const parentGroup = groups.find((g) => g.ID === group.ParentID);
  const assetCount = assets.filter((a) => a.GroupID === group.ID).length;

  const handleSave = async () => {
    let cmdPolicy = "";
    if (allowList.length > 0 || denyList.length > 0) {
      cmdPolicy = JSON.stringify({
        allow_list: allowList.length > 0 ? allowList : undefined,
        deny_list: denyList.length > 0 ? denyList : undefined,
      });
    }

    const updated = new group_entity.Group({
      ...group,
      CmdPolicy: cmdPolicy,
    });

    setSaving(true);
    try {
      await UpdateGroup(updated);
      await fetchGroups();
      toast.success(t("settings.saved"));
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <GroupIcon className="h-4 w-4 text-primary" style={group.Icon ? { color: getIconColor(group.Icon) } : undefined} />
        </div>
        <div>
          <h2 className="font-semibold leading-tight">{group.Name}</h2>
          <span className="text-xs text-muted-foreground">
            {t("asset.groupDetailTitle")}
          </span>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Basic info */}
        <div className="rounded-xl border bg-card p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">
                {t("asset.name")}
              </span>
              <p className="mt-0.5 font-medium">{group.Name}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">
                {t("asset.parentGroup")}
              </span>
              <p className="mt-0.5">
                {parentGroup?.Name || t("asset.parentGroupNone")}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">
                {t("asset.groupAssetCount")}
              </span>
              <p className="mt-0.5">{assetCount}</p>
            </div>
          </div>
          {group.Description && (
            <div className="mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground">
                {t("asset.description")}
              </span>
              <p className="mt-0.5 text-sm whitespace-pre-wrap">{group.Description}</p>
            </div>
          )}
        </div>

        {/* Command Policy */}
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {t("asset.cmdPolicy")}
          </h3>

          {/* Allow list */}
          <PolicyTagEditor
            label={t("asset.cmdPolicyAllowList")}
            items={allowList}
            input={allowInput}
            onInputChange={setAllowInput}
            onAdd={(val) => setAllowList([...allowList, val])}
            onRemove={(i) => setAllowList(allowList.filter((_, idx) => idx !== i))}
            placeholder={t("asset.cmdPolicyPlaceholder")}
            color="green"
          />

          {/* Deny list */}
          <PolicyTagEditor
            label={t("asset.cmdPolicyDenyList")}
            items={denyList}
            input={denyInput}
            onInputChange={setDenyInput}
            onAdd={(val) => setDenyList([...denyList, val])}
            onRemove={(i) => setDenyList(denyList.filter((_, idx) => idx !== i))}
            placeholder={t("asset.cmdPolicyPlaceholder")}
            color="red"
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t("asset.cmdPolicyGroupHint")}
            </p>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {t("action.save")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
