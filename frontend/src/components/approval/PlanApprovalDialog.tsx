import { useState, useEffect, useCallback } from "react";
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
import { EventsOn, EventsOff } from "../../../wailsjs/runtime/runtime";
import { RespondPlanApproval } from "../../../wailsjs/go/main/App";
import { ShieldAlert } from "lucide-react";

interface PlanItem {
  type: string;
  asset_id: number;
  asset_name: string;
  command: string;
  detail: string;
}

interface PlanApprovalEvent {
  session_id: string;
  description: string;
  items: PlanItem[];
}

export function PlanApprovalDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [event, setEvent] = useState<PlanApprovalEvent | null>(null);

  const handleEvent = useCallback((data: PlanApprovalEvent) => {
    setEvent(data);
    setOpen(true);
  }, []);

  useEffect(() => {
    EventsOn("opsctl:plan-approval", handleEvent);
    return () => { EventsOff("opsctl:plan-approval"); };
  }, [handleEvent]);

  const respond = useCallback((approved: boolean) => {
    if (event) {
      RespondPlanApproval(event.session_id, approved);
    }
    setOpen(false);
    setEvent(null);
  }, [event]);

  const typeLabel = (type: string) => {
    return t(`planApproval.type${type.charAt(0).toUpperCase() + type.slice(1)}`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) respond(false); }}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            {t("planApproval.title")}
          </DialogTitle>
          <DialogDescription>
            {t("planApproval.description")}
          </DialogDescription>
        </DialogHeader>
        {event && (
          <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
            {event.description && (
              <div className="text-sm font-medium">{event.description}</div>
            )}
            <div className="space-y-2">
              {event.items.map((item, index) => (
                <div key={index} className="rounded-md border p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{index + 1}.</span>
                    <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium">
                      {typeLabel(item.type)}
                    </span>
                    {item.asset_name && (
                      <span className="text-sm text-muted-foreground">{item.asset_name}</span>
                    )}
                  </div>
                  {item.command && (
                    <div className="rounded-md bg-muted p-2">
                      <code className="text-xs font-mono whitespace-pre-wrap break-all">{item.command}</code>
                    </div>
                  )}
                  {item.detail && !item.command && (
                    <div className="text-xs text-muted-foreground">{item.detail}</div>
                  )}
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("planApproval.itemCount", { count: event.items.length })}
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => respond(false)}>
            {t("planApproval.deny")}
          </Button>
          <Button onClick={() => respond(true)}>
            {t("planApproval.approveAll")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
