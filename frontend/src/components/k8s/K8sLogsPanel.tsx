import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ScrollText, Square, Play } from "lucide-react";
import { StartK8sPodLogs, StopK8sPodLogs } from "../../../wailsjs/go/app/App";
import { EventsOn, EventsOff } from "../../../wailsjs/runtime/runtime";
import { K8sSectionCard } from "./K8sSectionCard";
import { K8sLogTerminal, type K8sLogTerminalHandle } from "./K8sLogTerminal";

export interface LogTabState {
  logStreamID: string | null;
  logContainer: string;
  logTailLines: number;
  logError: string | null;
}

interface K8sLogsPanelProps {
  assetId: number;
  containers: { name: string }[];
  namespace: string;
  podName: string;
  state: LogTabState;
  onStateChange: (patch: Partial<LogTabState>) => void;
}

export function K8sLogsPanel({ assetId, containers, namespace, podName, state, onStateChange }: K8sLogsPanelProps) {
  const { t } = useTranslation();
  const terminalRef = useRef<K8sLogTerminalHandle>(null);
  const myStreamIDRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (myStreamIDRef.current) {
      StopK8sPodLogs(myStreamIDRef.current);
      myStreamIDRef.current = null;
    }
    onStateChange({ logStreamID: null });
  }, [onStateChange]);

  const start = useCallback(() => {
    stop();
    terminalRef.current?.clear();
    onStateChange({ logError: null });

    StartK8sPodLogs(assetId, namespace, podName, state.logContainer, state.logTailLines)
      .then((streamID: string) => {
        myStreamIDRef.current = streamID;
        onStateChange({ logStreamID: streamID });

        const dataEvent = "k8s:log:" + streamID;
        const errEvent = "k8s:logerr:" + streamID;
        const endEvent = "k8s:logend:" + streamID;

        EventsOn(dataEvent, (data: string) => {
          if (myStreamIDRef.current !== streamID) return;
          terminalRef.current?.write(atob(data));
        });

        EventsOn(errEvent, (err: string) => {
          if (myStreamIDRef.current !== streamID) return;
          if (err === "context canceled" || err.includes("context canceled")) return;
          onStateChange({ logError: err });
        });

        EventsOn(endEvent, () => {
          if (myStreamIDRef.current !== streamID) return;
          myStreamIDRef.current = null;
          onStateChange({ logStreamID: null });
          EventsOff(dataEvent);
          EventsOff(errEvent);
          EventsOff(endEvent);
        });
      })
      .catch((e: unknown) => {
        onStateChange({ logError: String(e) });
      });
  }, [assetId, namespace, podName, state.logContainer, state.logTailLines, stop, onStateChange]);

  useEffect(() => {
    return () => {
      if (myStreamIDRef.current) {
        StopK8sPodLogs(myStreamIDRef.current);
        myStreamIDRef.current = null;
      }
    };
  }, []);

  return (
    <K8sSectionCard className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ScrollText className="h-3.5 w-3.5" />
          {t("asset.k8sPodLogs")}
        </h4>
        <div className="flex items-center gap-2">
          <select
            className="h-7 rounded-md border bg-background px-2 text-xs"
            value={state.logContainer || containers[0]?.name || ""}
            onChange={(e) => {
              const container = e.target.value;
              onStateChange({ logContainer: container });
              if (state.logStreamID) {
                stop();
                // 注意：这里不自动 start，让用户手动点击开始
              }
            }}
            disabled={!!state.logStreamID}
          >
            {containers.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="h-7 w-16 rounded-md border bg-background px-2 text-xs"
            value={state.logTailLines}
            onChange={(e) => onStateChange({ logTailLines: Number(e.target.value) })}
            disabled={!!state.logStreamID}
            min={1}
            max={10000}
            title={t("asset.k8sPodLogsTailLines")}
          />
          {state.logStreamID ? (
            <button
              onClick={stop}
              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/50 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
            >
              <Square className="h-3 w-3" />
              {t("asset.k8sPodLogsStop")}
            </button>
          ) : (
            <button
              onClick={start}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/50 px-3 py-1.5 text-xs text-primary hover:bg-primary/10"
            >
              <Play className="h-3 w-3" />
              {t("asset.k8sPodLogsStart")}
            </button>
          )}
        </div>
      </div>
      {state.logError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive mb-3">
          {t("asset.k8sPodLogsError")}: {state.logError}
        </div>
      )}
      <K8sLogTerminal ref={terminalRef} />
    </K8sSectionCard>
  );
}
