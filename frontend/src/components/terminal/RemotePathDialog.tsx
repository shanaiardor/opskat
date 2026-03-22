import { useState } from "react";
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

interface RemotePathDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onConfirm: (remotePath: string) => void;
}

export function RemotePathDialog({
  open,
  onOpenChange,
  title,
  onConfirm,
}: RemotePathDialogProps) {
  const { t } = useTranslation();
  const [remotePath, setRemotePath] = useState("~/");

  const handleConfirm = () => {
    if (!remotePath.trim()) return;
    onConfirm(remotePath.trim());
    onOpenChange(false);
    setRemotePath("~/");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>{t("sftp.remotePath")}</Label>
          <Input
            value={remotePath}
            onChange={(e) => setRemotePath(e.target.value)}
            placeholder={t("sftp.remotePathPlaceholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirm();
            }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("action.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={!remotePath.trim()}>
            {t("action.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
