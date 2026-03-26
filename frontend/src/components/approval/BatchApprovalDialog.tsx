import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWailsEvent } from "@/hooks/useWailsEvent";
import { RespondOpsctlApproval } from "../../../wailsjs/go/app/App";
import { ShieldAlert, Terminal, Database, Server } from "lucide-react";

interface BatchItem {
  type: string;
  asset_id: number;
  asset_name: string;
  command: string;
}

interface BatchApprovalEvent {
  confirm_id: string;
  session_id?: string;
  items: BatchItem[];
}

const typeIcons: Record<string, typeof Terminal> = {
  exec: Terminal,
  sql: Database,
  redis: Server,
};

function TypeBadge({ type }: { type: string }) {
  const label = type.toUpperCase();
  const Icon = typeIcons[type] || Terminal;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export function BatchApprovalDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [event, setEvent] = useState<BatchApprovalEvent | null>(null);

  const handleEvent = useCallback((data: BatchApprovalEvent) => {
    setEvent(data);
    setOpen(true);
  }, []);

  useWailsEvent("opsctl:batch-approval", handleEvent);

  const respond = useCallback(
    (approved: boolean) => {
      if (event) {
        RespondOpsctlApproval(event.confirm_id, approved);
      }
      setOpen(false);
      setEvent(null);
    },
    [event]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) respond(false);
      }}
    >
      <DialogContent
        className="sm:max-w-lg max-h-[80vh] flex flex-col"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            {t("batchApproval.title")}
          </DialogTitle>
          <DialogDescription>{t("batchApproval.description", { count: event?.items.length ?? 0 })}</DialogDescription>
        </DialogHeader>
        {event && (
          <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
            {event.items.map((item, index) => (
              <div key={index} className="rounded-md border p-2 space-y-1">
                <div className="flex items-center gap-2">
                  <TypeBadge type={item.type} />
                  <span className="text-sm text-muted-foreground">
                    {item.asset_name}
                    {item.asset_id > 0 && ` (ID: ${item.asset_id})`}
                  </span>
                </div>
                <div className="rounded-md bg-muted p-2 max-h-[100px] overflow-auto">
                  <code className="text-xs font-mono whitespace-pre-wrap break-all">{item.command}</code>
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => respond(false)}>
            {t("batchApproval.denyAll")}
          </Button>
          <Button onClick={() => respond(true)}>{t("batchApproval.approveAll")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
