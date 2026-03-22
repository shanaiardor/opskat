import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Copy, Key, FileKey, Download, Pencil } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ListSSHKeys,
  GenerateSSHKey,
  ImportSSHKeyFile,
  ImportSSHKeyPEM,
  UpdateSSHKey,
  DeleteSSHKey,
  GetSSHKeyPublicKey,
  GetSSHKeyUsage,
} from "../../../wailsjs/go/main/App";
import { ssh_key_entity } from "../../../wailsjs/go/models";

export function SSHKeyManager() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState<ssh_key_entity.SSHKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ssh_key_entity.SSHKey | null>(null);
  const [deleteKey, setDeleteKey] = useState<ssh_key_entity.SSHKey | null>(null);
  const [deleteUsage, setDeleteUsage] = useState<string[]>([]);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const result = await ListSSHKeys();
      setKeys(result || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleDeleteClick = async (key: ssh_key_entity.SSHKey) => {
    try {
      const usage = await GetSSHKeyUsage(key.id);
      setDeleteUsage(usage || []);
    } catch {
      setDeleteUsage([]);
    }
    setDeleteKey(key);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteKey) return;
    try {
      await DeleteSSHKey(deleteKey.id);
      toast.success(t("sshKey.deleteSuccess"));
      setDeleteKey(null);
      fetchKeys();
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleCopyPublicKey = async (id: number) => {
    try {
      const pubKey = await GetSSHKeyPublicKey(id);
      await navigator.clipboard.writeText(pubKey);
      toast.success(t("sshKey.copied"));
    } catch (e) {
      toast.error(String(e));
    }
  };

  const keyTypeLabel = (keyType: string, keySize: number) => {
    switch (keyType) {
      case "rsa":
        return `RSA${keySize ? ` ${keySize}` : ""}`;
      case "ed25519":
        return "ED25519";
      case "ecdsa":
        return `ECDSA${keySize ? ` P-${keySize}` : ""}`;
      default:
        return keyType;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("sshKey.title")}</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setImportOpen(true)}
          >
            <Download className="h-3.5 w-3.5" />
            {t("sshKey.import")}
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setGenerateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("sshKey.generate")}
          </Button>
        </div>
      </div>

      {keys.length === 0 && !loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Key className="h-8 w-8 mx-auto mb-2 opacity-30" />
          {t("sshKey.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileKey className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {key.name}
                    {key.comment && key.comment !== key.name && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        ({key.comment})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-2">
                    <span>{keyTypeLabel(key.keyType, key.keySize)}</span>
                    <span className="font-mono truncate max-w-48">
                      {key.fingerprint}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title={t("sshKey.copyPublicKey")}
                  onClick={() => handleCopyPublicKey(key.id)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title={t("action.edit")}
                  onClick={() => setEditingKey(key)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  title={t("sshKey.delete")}
                  onClick={() => handleDeleteClick(key)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <GenerateKeyDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onSuccess={fetchKeys}
      />
      <ImportKeyDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={fetchKeys}
      />
      <EditKeyDialog
        open={!!editingKey}
        onOpenChange={(open) => !open && setEditingKey(null)}
        editKey={editingKey}
        onSuccess={fetchKeys}
      />

      <Dialog open={!!deleteKey} onOpenChange={(open) => !open && setDeleteKey(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("sshKey.deleteConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteUsage.length > 0
              ? t("sshKey.deleteConfirmUsage", {
                  name: deleteKey?.name,
                  assets: deleteUsage.join(", "),
                })
              : t("sshKey.deleteConfirm", { name: deleteKey?.name })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteKey(null)}>
              {t("action.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              {t("action.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GenerateKeyDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [keyType, setKeyType] = useState("ed25519");
  const [keySize, setKeySize] = useState(4096);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setComment("");
      setKeyType("ed25519");
      setKeySize(4096);
    }
  }, [open]);

  const handleGenerate = async () => {
    setSaving(true);
    try {
      await GenerateSSHKey(name, comment, keyType, keySize);
      toast.success(t("sshKey.generateSuccess"));
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  const sizeOptions = () => {
    switch (keyType) {
      case "rsa":
        return [
          { value: 2048, label: "2048 bits" },
          { value: 4096, label: "4096 bits" },
        ];
      case "ecdsa":
        return [
          { value: 256, label: "P-256" },
          { value: 384, label: "P-384" },
          { value: 521, label: "P-521" },
        ];
      default:
        return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("sshKey.generateTitle")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>{t("sshKey.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("sshKey.namePlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("sshKey.comment")}</Label>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("sshKey.commentPlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("sshKey.type")}</Label>
            <Select value={keyType} onValueChange={setKeyType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ed25519">ED25519</SelectItem>
                <SelectItem value="rsa">RSA</SelectItem>
                <SelectItem value="ecdsa">ECDSA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {sizeOptions().length > 0 && (
            <div className="grid gap-2">
              <Label>{t("sshKey.size")}</Label>
              <Select
                value={String(keySize)}
                onValueChange={(v) => setKeySize(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sizeOptions().map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("action.cancel")}
          </Button>
          <Button onClick={handleGenerate} disabled={saving || !name}>
            {saving ? t("sshKey.generating") : t("sshKey.generate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportKeyDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [pemContent, setPemContent] = useState("");
  const [mode, setMode] = useState<"file" | "pem">("file");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setComment("");
      setPemContent("");
      setMode("file");
    }
  }, [open]);

  const handleImportFile = async () => {
    setSaving(true);
    try {
      const result = await ImportSSHKeyFile(name, comment);
      if (result) {
        toast.success(t("sshKey.importSuccess"));
        onOpenChange(false);
        onSuccess();
      }
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleImportPEM = async () => {
    setSaving(true);
    try {
      await ImportSSHKeyPEM(name, comment, pemContent);
      toast.success(t("sshKey.importSuccess"));
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("sshKey.importTitle")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>{t("sshKey.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("sshKey.namePlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("sshKey.comment")}</Label>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("sshKey.commentPlaceholder")}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={mode === "file" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("file")}
            >
              {t("sshKey.importFile")}
            </Button>
            <Button
              variant={mode === "pem" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("pem")}
            >
              {t("sshKey.importPEM")}
            </Button>
          </div>
          {mode === "pem" && (
            <div className="grid gap-2">
              <Textarea
                value={pemContent}
                onChange={(e) => setPemContent(e.target.value)}
                placeholder={t("sshKey.pemPlaceholder")}
                rows={6}
                className="font-mono text-xs"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("action.cancel")}
          </Button>
          {mode === "file" ? (
            <Button onClick={handleImportFile} disabled={saving || !name}>
              {saving ? t("sshKey.importing") : t("sshKey.importFile")}
            </Button>
          ) : (
            <Button
              onClick={handleImportPEM}
              disabled={saving || !name || !pemContent}
            >
              {saving ? t("sshKey.importing") : t("sshKey.import")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditKeyDialog({
  open,
  onOpenChange,
  editKey,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editKey: ssh_key_entity.SSHKey | null;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && editKey) {
      setName(editKey.name);
      setComment(editKey.comment || "");
    }
  }, [open, editKey]);

  const handleSave = async () => {
    if (!editKey) return;
    setSaving(true);
    try {
      await UpdateSSHKey(editKey.id, name, comment);
      toast.success(t("sshKey.updateSuccess"));
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("sshKey.editTitle")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>{t("sshKey.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("sshKey.namePlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("sshKey.comment")}</Label>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("sshKey.commentPlaceholder")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("action.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || !name}>
            {saving ? t("action.saving") : t("action.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
