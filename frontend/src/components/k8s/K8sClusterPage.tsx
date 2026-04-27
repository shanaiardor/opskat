import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Server, Box, Layers, RefreshCw } from "lucide-react";
import type { asset_entity } from "../../../wailsjs/go/models";
import { GetK8sClusterInfo } from "../../../wailsjs/go/app/App";

interface NodeInfo {
  name: string;
  status: string;
  roles: string[];
  version: string;
  cpu: string;
  memory: string;
  os: string;
  arch: string;
}

interface NamespaceInfo {
  name: string;
  status: string;
}

interface ClusterInfo {
  version: string;
  platform: string;
  nodes: NodeInfo[];
  namespaces: NamespaceInfo[];
}

type InnerTabId = "overview" | `node:${string}` | `ns:${string}`;

interface InnerTab {
  id: InnerTabId;
  label: string;
}

interface Props {
  asset: asset_entity.Asset;
}

export function K8sClusterPage({ asset }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<ClusterInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [innerTabs, setInnerTabs] = useState<InnerTab[]>([{ id: "overview", label: t("asset.k8sClusterOverview") }]);
  const [activeTabId, setActiveTabId] = useState<InnerTabId>("overview");
  const [expanded, setExpanded] = useState<{ nodes: boolean; namespaces: boolean }>({
    nodes: false,
    namespaces: false,
  });

  const loadInfo = () => {
    setLoading(true);
    setError(null);
    GetK8sClusterInfo(asset.ID)
      .then((result: string) => {
        const data = JSON.parse(result) as ClusterInfo;
        setInfo(data);
        setInnerTabs([{ id: "overview", label: t("asset.k8sClusterOverview") }]);
        setActiveTabId("overview");
      })
      .catch((e: unknown) => {
        setError(String(e));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.ID]);

  const openTab = (id: InnerTabId, label: string) => {
    if (id === "overview") {
      setActiveTabId("overview");
      return;
    }
    if (!innerTabs.some((t) => t.id === id)) {
      setInnerTabs([...innerTabs, { id, label }]);
    }
    setActiveTabId(id);
  };

  const closeTab = (id: InnerTabId) => {
    const idx = innerTabs.findIndex((t) => t.id === id);
    const next = innerTabs.filter((t) => t.id !== id);
    setInnerTabs(next);
    if (activeTabId === id) {
      const neighbor = innerTabs[idx + 1] || innerTabs[idx - 1];
      setActiveTabId(neighbor?.id || "overview");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive max-w-md text-center">
          {error}
        </div>
        <button
          onClick={loadInfo}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("action.retry")}
        </button>
      </div>
    );
  }

  if (!info) return null;

  const activeTab = innerTabs.find((t) => t.id === activeTabId);
  const activeNode = activeTabId.startsWith("node:") ? info.nodes.find((n) => n.name === activeTabId.slice(5)) : null;
  const activeNs = activeTabId.startsWith("ns:")
    ? info.namespaces.find((n) => n.name === activeTabId.slice(3))
    : null;

  return (
    <div className="flex h-full w-full">
      <div className="shrink-0 w-52 border-r border-border bg-sidebar h-full overflow-y-auto">
        <div className="p-3 border-b border-border">
          <h2 className="text-sm font-semibold truncate">{asset.Name}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">v{info.version}</p>
        </div>

        <div className="p-2">
          <button
            onClick={loadInfo}
            className="flex items-center gap-1.5 w-full rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 mb-1"
          >
            <RefreshCw className="h-3 w-3" />
            {t("action.refresh")}
          </button>

          <div
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs cursor-pointer mb-0.5 ${
              activeTabId === "overview" ? "bg-muted font-medium" : "hover:bg-muted/50"
            }`}
            onClick={() => setActiveTabId("overview")}
          >
            <Server className="h-3.5 w-3.5" />
            {t("asset.k8sClusterOverview")}
          </div>

          <div
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs cursor-pointer hover:bg-muted/50"
            onClick={() => setExpanded({ ...expanded, nodes: !expanded.nodes })}
          >
            <span className="text-[10px] w-3">{expanded.nodes ? "\u25BC" : "\u25B6"}</span>
            <Box className="h-3.5 w-3.5" />
            {t("asset.k8sNodes")}
            <span className="ml-auto text-[10px] text-muted-foreground">{info.nodes.length}</span>
          </div>
          {expanded.nodes &&
            info.nodes.map((node) => (
              <div
                key={node.name}
                className={`flex items-center gap-1.5 pl-8 pr-2 py-1.5 rounded-md text-xs cursor-pointer ml-1 ${
                  activeTabId === `node:${node.name}` ? "bg-muted font-medium" : "hover:bg-muted/50"
                }`}
                onClick={() => openTab(`node:${node.name}`, node.name)}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    node.status === "True" ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="truncate">{node.name}</span>
              </div>
            ))}

          <div
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs cursor-pointer hover:bg-muted/50"
            onClick={() => setExpanded({ ...expanded, namespaces: !expanded.namespaces })}
          >
            <span className="text-[10px] w-3">{expanded.namespaces ? "\u25BC" : "\u25B6"}</span>
            <Layers className="h-3.5 w-3.5" />
            {t("asset.k8sNamespaces")}
            <span className="ml-auto text-[10px] text-muted-foreground">{info.namespaces.length}</span>
          </div>
          {expanded.namespaces &&
            info.namespaces.map((ns) => (
              <div
                key={ns.name}
                className={`flex items-center gap-1.5 pl-8 pr-2 py-1.5 rounded-md text-xs cursor-pointer ml-1 ${
                  activeTabId === `ns:${ns.name}` ? "bg-muted font-medium" : "hover:bg-muted/50"
                }`}
                onClick={() => openTab(`ns:${ns.name}`, ns.name)}
              >
                <span className="truncate">{ns.name}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="w-[3px] shrink-0 cursor-col-resize hover:bg-ring/40 active:bg-ring/60 transition-colors" />

      <div className="flex-1 min-w-0 flex flex-col h-full">
        {innerTabs.length > 0 && (
          <div className="flex items-center border-b border-border bg-muted/30 shrink-0 overflow-x-auto">
            {innerTabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r border-border whitespace-nowrap select-none transition-colors duration-150 ${
                    isActive ? "bg-background border-b-2 border-b-primary -mb-[1px] font-medium" : "hover:bg-muted/50"
                  }`}
                  onClick={() => setActiveTabId(tab.id)}
                >
                  {tab.id === "overview" ? (
                    <Server className="h-3 w-3" />
                  ) : tab.id.startsWith("node:") ? (
                    <Box className="h-3 w-3" />
                  ) : (
                    <Layers className="h-3 w-3" />
                  )}
                  {tab.label}
                  {tab.id !== "overview" && (
                    <button
                      className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" className="text-muted-foreground">
                        <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.2" />
                        <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {activeTabId === "overview" && (
            <div className="max-w-4xl mx-auto p-6 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="text-xs text-muted-foreground mb-1">{t("asset.k8sVersion")}</div>
                  <div className="text-lg font-mono font-semibold">{info.version}</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="text-xs text-muted-foreground mb-1">{t("asset.k8sPlatform")}</div>
                  <div className="text-lg font-mono font-semibold">{info.platform}</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="text-xs text-muted-foreground mb-1">{t("asset.k8sNodes")}</div>
                  <div className="text-lg font-mono font-semibold">{info.nodes.length}</div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6">
                <h3 className="text-sm font-semibold mb-3">{t("asset.k8sNodes")}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {info.nodes.map((node) => (
                    <div
                      key={node.name}
                      className="rounded-lg border p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => openTab(`node:${node.name}`, node.name)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm font-medium">{node.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            node.status === "True"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                          }`}
                        >
                          {node.status === "True" ? "Ready" : node.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                        <span>OS: {node.os}</span>
                        <span>Arch: {node.arch}</span>
                        <span>CPU: {node.cpu}</span>
                        <span>Mem: {node.memory}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6">
                <h3 className="text-sm font-semibold mb-3">{t("asset.k8sNamespaces")}</h3>
                <div className="flex flex-wrap gap-2">
                  {info.namespaces.map((ns) => (
                    <span
                      key={ns.name}
                      className={`inline-flex items-center rounded-md border px-3 py-1 text-sm font-mono cursor-pointer hover:bg-muted/50 ${
                        ns.status === "Active" ? "" : "text-muted-foreground border-dashed"
                      }`}
                      onClick={() => openTab(`ns:${ns.name}`, ns.name)}
                    >
                      {ns.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeNode && (
            <div className="max-w-4xl mx-auto p-6 space-y-6">
              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold">{activeNode.name}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      activeNode.status === "True"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                    }`}
                  >
                    {activeNode.status === "True" ? "Ready" : activeNode.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="text-xs text-muted-foreground mb-1">OS</div>
                    <div className="font-mono font-medium">{activeNode.os}</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="text-xs text-muted-foreground mb-1">Architecture</div>
                    <div className="font-mono font-medium">{activeNode.arch}</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="text-xs text-muted-foreground mb-1">Kubernetes</div>
                    <div className="font-mono font-medium">v{activeNode.version}</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="text-xs text-muted-foreground mb-1">CPU</div>
                    <div className="font-mono font-medium">{activeNode.cpu}</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="text-xs text-muted-foreground mb-1">Memory</div>
                    <div className="font-mono font-medium">{activeNode.memory}</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="text-xs text-muted-foreground mb-1">Roles</div>
                    <div className="font-mono font-medium">{activeNode.roles.join(", ")}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeNs && (
            <div className="max-w-4xl mx-auto p-6 space-y-6">
              <div className="rounded-xl border bg-card p-6">
                <h3 className="text-base font-semibold mb-2">{activeNs.name}</h3>
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="text-xs text-muted-foreground mb-1">Status</div>
                  <div className="font-mono font-medium">{activeNs.status}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
