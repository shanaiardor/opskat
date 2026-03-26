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
import { Input } from "@/components/ui/input";
import { useWailsEvent } from "@/hooks/useWailsEvent";
import { RespondOpsctlApproval, RespondOpsctlApprovalGrant } from "../../../wailsjs/go/app/App";
import { ShieldAlert, Check, X } from "lucide-react";

interface ApprovalEvent {
  confirm_id: string;
  type: string;
  asset_id: number;
  asset_name: string;
  command: string;
  detail: string;
  session_id?: string;
}

export function OpsctlApprovalDialog() {
  const { t } = useTranslation();
  const [queue, setQueue] = useState<ApprovalEvent[]>([]);
  // Pattern state per confirm_id for "Remember" feature
  const [patterns, setPatterns] = useState<Record<string, string>>({});

  const handleEvent = useCallback((data: ApprovalEvent) => {
    setQueue((prev) => {
      // Avoid duplicates
      if (prev.some((e) => e.confirm_id === data.confirm_id)) return prev;
      return [...prev, data];
    });
    setPatterns((prev) => ({ ...prev, [data.confirm_id]: data.command || "" }));
  }, []);

  useWailsEvent("opsctl:approval", handleEvent);

  const open = queue.length > 0;

  // Respond to a single item and remove from queue
  const respondOne = useCallback((confirmId: string, approved: boolean) => {
    RespondOpsctlApproval(confirmId, approved);
    setQueue((prev) => prev.filter((e) => e.confirm_id !== confirmId));
    setPatterns((prev) => {
      const next = { ...prev };
      delete next[confirmId];
      return next;
    });
  }, []);

  // Respond with "Remember" for a single item
  const respondRememberOne = useCallback(
    (event: ApprovalEvent) => {
      const pattern = patterns[event.confirm_id] || "";
      if (event.session_id && pattern) {
        RespondOpsctlApprovalGrant(event.confirm_id, true, event.session_id, event.asset_id, event.asset_name, pattern);
      } else {
        RespondOpsctlApproval(event.confirm_id, true);
      }
      setQueue((prev) => prev.filter((e) => e.confirm_id !== event.confirm_id));
      setPatterns((prev) => {
        const next = { ...prev };
        delete next[event.confirm_id];
        return next;
      });
    },
    [patterns]
  );

  // Batch operations
  const respondAll = useCallback(
    (approved: boolean) => {
      for (const event of queue) {
        RespondOpsctlApproval(event.confirm_id, approved);
      }
      setQueue([]);
      setPatterns({});
    },
    [queue]
  );

  const respondDenyAll = useCallback(() => {
    respondAll(false);
  }, [respondAll]);

  // When dialog closes via escape or overlay, deny all
  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!v) respondDenyAll();
    },
    [respondDenyAll]
  );

  const isSingle = queue.length === 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md max-h-[80vh] flex flex-col"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            {t("opsctlApproval.title")}
            {!isSingle && <span className="text-sm font-normal text-muted-foreground">({queue.length})</span>}
          </DialogTitle>
          <DialogDescription>{t("opsctlApproval.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
          {queue.map((event) => {
            const typeLabel = t(`opsctlApproval.type${event.type.charAt(0).toUpperCase() + event.type.slice(1)}`);
            return (
              <div key={event.confirm_id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {event.session_id && (
                      <div className="text-xs text-blue-500 font-medium shrink-0">
                        {t("opsctlApproval.sessionHint")}
                      </div>
                    )}
                    <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium shrink-0">
                      {typeLabel}
                    </span>
                    {event.asset_name && (
                      <span className="text-sm text-muted-foreground truncate">
                        {event.asset_name}
                        {event.asset_id > 0 && ` (ID: ${event.asset_id})`}
                      </span>
                    )}
                  </div>
                  {!isSingle && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => respondOne(event.confirm_id, true)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => respondOne(event.confirm_id, false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                {event.command && (
                  <div className="rounded-md bg-muted p-2 max-h-[150px] overflow-auto">
                    <code className="text-sm font-mono whitespace-pre-wrap break-all">{event.command}</code>
                  </div>
                )}
                <div className="text-xs text-muted-foreground font-mono">{event.detail}</div>
                {isSingle && event.session_id && event.command && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t("opsctlApproval.patternLabel")}
                    </label>
                    <Input
                      value={patterns[event.confirm_id] || ""}
                      onChange={(e) => setPatterns((prev) => ({ ...prev, [event.confirm_id]: e.target.value }))}
                      placeholder={t("opsctlApproval.patternPlaceholder")}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">{t("opsctlApproval.patternHint")}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter className="gap-2">
          {isSingle ? (
            <>
              <Button variant="outline" onClick={() => respondOne(queue[0].confirm_id, false)}>
                {t("opsctlApproval.deny")}
              </Button>
              <Button variant="secondary" onClick={() => respondOne(queue[0].confirm_id, true)}>
                {t("opsctlApproval.allow")}
              </Button>
              {queue[0]?.session_id && queue[0]?.command && (
                <Button
                  onClick={() => respondRememberOne(queue[0])}
                  disabled={!(patterns[queue[0].confirm_id] || "").trim()}
                >
                  {t("opsctlApproval.remember")}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={respondDenyAll}>
                {t("opsctlApproval.denyAll")}
              </Button>
              <Button onClick={() => respondAll(true)}>{t("opsctlApproval.approveAll")}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
